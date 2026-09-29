import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar, Pressable } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { auth, db, storage, analyzeBetSlipImage } from './src/firebase';
import DashboardScreen from './src/DashboardScreen';
import AddBetScreen from './src/AddBetScreen';
import BetListScreen from './src/BetListScreen';
import InsightsScreen from './src/InsightsScreen';
import ShareBadgeModal from './src/ShareBadgeModal';
import { colors, summarize, computeScore, currentTier } from './src/theme';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surfaceSolid, border: colors.border, text: colors.text, primary: colors.gold },
};

// --- Auth -------------------------------------------------------------------
function useAuthUser() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setAuthLoading(false); }
      else { signInAnonymously(auth).catch(e => { console.error('Auth error', e); setAuthLoading(false); }); }
    });
    return unsub;
  }, []);

  return { user, authLoading };
}

// --- Bets -------------------------------------------------------------------
function useBets(userId) {
  const [bets, setBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'bets'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      snap => { setBets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setBetsLoading(false); },
      e => { console.error('Bets subscription error', e); setBetsLoading(false); }
    );
    return unsub;
  }, [userId]);

  return { bets, betsLoading };
}

// --- API-Football stub ------------------------------------------------------
async function lookupFixture(matchName) {
  // Σύνδεσέ το με το πραγματικό RapidAPI endpoint όταν πάρεις key.
  // Μέχρι τότε όλα τα δελτία μένουν self-reported.
  return null;
}

export default function App() {
  const { user, authLoading } = useAuthUser();
  const { bets, betsLoading } = useBets(user?.uid);
  const [shareTarget, setShareTarget] = useState(null); // 'score' | bet object | null

  const summary = summarize(bets);
  const score = computeScore(summary);
  const { tier } = currentTier(score);

  const handleAnalyzeImage = useCallback(async ({ base64, mediaType }) => {
    return analyzeBetSlipImage({ base64, mediaType });
  }, []);

  const handleSaveBet = useCallback(async (bet, imgData) => {
    let sourceImageUrl = null;
    if (imgData?.uri) {
      try {
        // React Native: δεν υπάρχει uploadString για file URIs — κατεβάζουμε
        // το local file ως blob και το ανεβάζουμε με uploadBytes.
        const response = await fetch(imgData.uri);
        const blob = await response.blob();
        const imgRef = ref(storage, `bet-screenshots/${user.uid}/${Date.now()}.jpg`);
        await uploadBytes(imgRef, blob, { contentType: imgData.mediaType });
        sourceImageUrl = await getDownloadURL(imgRef);
      } catch (e) {
        console.error('Screenshot upload failed, αποθηκεύω χωρίς εικόνα', e);
      }
    }
    await addDoc(collection(db, 'bets'), { ...bet, sourceImageUrl });
  }, [user]);

  const handleDeleteBet = useCallback(async (betId) => {
    try { await deleteDoc(doc(db, 'bets', betId)); } catch (e) { console.error('Delete failed', e); }
  }, []);

  if (authLoading || betsLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Φόρτωση...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              position: 'absolute', bottom: 20, left: 18, right: 18,
              backgroundColor: 'rgba(18,26,40,0.95)',
              borderTopWidth: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 24, height: 64, paddingBottom: 8, paddingTop: 8,
              elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20,
            },
            tabBarActiveTintColor: colors.gold,
            tabBarInactiveTintColor: colors.muted,
            tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
          }}
        >
          <Tab.Screen
            name="Overview"
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text> }}
          >
            {() => (
              <SafeAreaView style={styles.screen} edges={['top']}>
                <DashboardScreen
                  summary={summary}
                  score={score}
                  bets={bets}
                  onShare={() => setShareTarget('score')}
                />
              </SafeAreaView>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Σκανάρισμα"
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>➕</Text> }}
          >
            {() => (
              <SafeAreaView style={styles.screen} edges={['top']}>
                <AddBetScreen
                  userId={user.uid}
                  onSave={handleSaveBet}
                  analyzeImage={handleAnalyzeImage}
                  lookupFixture={lookupFixture}
                />
              </SafeAreaView>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Δελτία"
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📑</Text> }}
          >
            {() => (
              <SafeAreaView style={styles.screen} edges={['top']}>
                <BetListScreen
                  bets={bets}
                  onDelete={handleDeleteBet}
                  onShare={(bet) => setShareTarget(bet)}
                />
              </SafeAreaView>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Insights"
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }}
          >
            {() => (
              <SafeAreaView style={styles.screen} edges={['top']}>
                <InsightsScreen bets={bets} />
              </SafeAreaView>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>

      <ShareBadgeModal
        visible={!!shareTarget}
        mode={shareTarget === 'score' ? 'score' : 'bet'}
        bet={shareTarget === 'score' ? null : shareTarget}
        score={score}
        tierName={tier.name}
        onClose={() => setShareTarget(null)}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 14 },
});
