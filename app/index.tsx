import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import FloatingCard from '../components/FloatingCard';
import MetricOrb from '../components/MetricOrb';
import Sparkline from '../components/Sparkline';
import { createMission, createPatternMap } from '../lib/api';
import { configureRevenueCat, getCurrentOffering, buyPackage, restorePurchases, hasProEntitlement } from '../lib/revenuecat';
import { getOrCreateUserId, loadSnapshot, saveSnapshot } from '../lib/storage';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../lib/theme';
import type { DailyMission, DifficultyFeedback, LiveStats, PatternMap, Profile } from '../lib/types';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const EMPTY_PROFILE: Profile = {
  identity: '',
  focusArea: '',
  struggle: '',
  trigger: '',
  supportStyle: '',
  energyWindow: '',
};

const DEFAULT_STATS: LiveStats = {
  streakDays: 0,
  completedMissions: 0,
  totalAttempts: 0,
  frictionFit: 58,
  identityScore: 54,
  history: [42, 48, 52, 50, 61, 64, 70],
};

export default function Screen() {
  const [userId, setUserId] = useState('');
  const [booted, setBooted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile>(EMPTY_PROFILE);
  const [patternMap, setPatternMap] = useState<PatternMap | null>(null);
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats>(DEFAULT_STATS);
  const [lastFeedback, setLastFeedback] = useState<DifficultyFeedback>('right');
  const [pro, setPro] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const id = await getOrCreateUserId();
        setUserId(id);
        await configureRevenueCat(id);

        const [snapshot, isPro, currentOffering] = await Promise.all([
          loadSnapshot(),
          hasProEntitlement(),
          getCurrentOffering(),
        ]);

        if (snapshot?.profile) {
          setProfile(snapshot.profile);
          setDraft(snapshot.profile);
        }

        if (snapshot?.patternMap) setPatternMap(snapshot.patternMap);
        if (snapshot?.mission) setMission(snapshot.mission);
        if (snapshot?.liveStats) setLiveStats(snapshot.liveStats);
        if (snapshot?.lastFeedback) setLastFeedback(snapshot.lastFeedback);

        setPro(Boolean(snapshot?.pro || isPro));
        setOffering(currentOffering);
      } catch (error) {
        console.warn(error);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!booted) return;

    saveSnapshot({
      profile,
      patternMap,
      mission,
      pro,
      liveStats,
      lastFeedback,
    }).catch((error) => console.warn('Failed to save snapshot', error));
  }, [booted, profile, patternMap, mission, pro, liveStats, lastFeedback]);

  const metrics = useMemo(() => {
    const source = patternMap?.baselineMetrics ?? [];
    return [
      {
        label: source[0]?.label ?? 'Consistency',
        score: Math.min(100, liveStats.completedMissions * 8 + 44),
      },
      {
        label: source[1]?.label ?? 'Friction Fit',
        score: liveStats.frictionFit,
      },
      {
        label: source[2]?.label ?? 'Identity',
        score: liveStats.identityScore,
      },
    ];
  }, [patternMap, liveStats]);

  const packages = offering?.availablePackages ?? [];

  async function handleCreatePlan() {
    const required = Object.values(draft).every((value) => value.trim().length > 0);
    if (!required) {
      Alert.alert('Fill every field', 'Unwall needs a complete starting profile to build your first pattern map.');
      return;
    }

    try {
      setLoading(true);
      const nextProfile = { ...draft };
      const result = await createPatternMap(userId, nextProfile);

      setProfile(nextProfile);
      setPatternMap(result.patternMap);
      setMission(result.mission);
      setLiveStats({
        ...DEFAULT_STATS,
        frictionFit: result.patternMap.baselineMetrics[1]?.score ?? 58,
        identityScore: result.patternMap.baselineMetrics[2]?.score ?? 54,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Could not build plan', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleNextMission(feedback: DifficultyFeedback) {
    if (!profile) return;

    try {
      setLoading(true);
      setLastFeedback(feedback);
      const result = await createMission(userId, profile, liveStats, feedback);
      setMission(result.mission);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Could not refresh mission', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteMission() {
    if (!mission) return;

    const nextCompleted = liveStats.completedMissions + 1;
    const nextAttempts = liveStats.totalAttempts + 1;

    setLiveStats((current) => ({
      streakDays: current.streakDays + 1,
      completedMissions: nextCompleted,
      totalAttempts: nextAttempts,
      frictionFit: Math.min(100, current.frictionFit + 4),
      identityScore: Math.min(100, current.identityScore + 3),
      history: [...current.history.slice(-11), Math.min(100, current.identityScore + 3)],
    }));

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Logged', 'Mission completed. Your evidence board has been updated.');
  }

  async function handleBuy(pkg: PurchasesPackage) {
    try {
      setLoading(true);
      const unlocked = await buyPackage(pkg);
      if (unlocked) {
        setPro(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Purchase not completed', 'The purchase did not unlock Pro access.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    try {
      setLoading(true);
      const restored = await restorePurchases();
      if (restored) {
        setPro(true);
        Alert.alert('Restored', 'Your Pro subscription is active again.');
      } else {
        Alert.alert('Nothing to restore', 'No active Pro entitlement was found.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!booted) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.olive} />
      </SafeAreaView>
    );
  }

  const locked = Boolean(patternMap && !pro);

  return (
    <LinearGradient colors={[COLORS.bg, COLORS.bg2]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.brand}>Unwall</Text>
            <Text style={styles.tag}>Pattern intelligence for identity change</Text>
          </View>

          {!profile || !patternMap || !mission ? (
            <View>
              <Text style={styles.heroTitle}>Build your first rewiring map</Text>
              <Text style={styles.heroSub}>
                This is a premium daily system for habit change, focus, and consistency. Not therapy. Not fluff.
              </Text>

              <FloatingCard>
                <Text style={styles.cardEyebrow}>Identity intake</Text>

                <Field
                  label="Who are you becoming?"
                  value={draft.identity}
                  onChangeText={(value) => setDraft((s) => ({ ...s, identity: value }))}
                  placeholder="Someone who follows through calmly"
                />
                <Field
                  label="Main focus area"
                  value={draft.focusArea}
                  onChangeText={(value) => setDraft((s) => ({ ...s, focusArea: value }))}
                  placeholder="Fitness, writing, deep work, discipline"
                />
                <Field
                  label="Where you keep getting stuck"
                  value={draft.struggle}
                  onChangeText={(value) => setDraft((s) => ({ ...s, struggle: value }))}
                  placeholder="I procrastinate when the task feels big"
                />
                <Field
                  label="Main trigger"
                  value={draft.trigger}
                  onChangeText={(value) => setDraft((s) => ({ ...s, trigger: value }))}
                  placeholder="Afternoon slump, uncertainty, phone scrolling"
                />
                <Field
                  label="Support style"
                  value={draft.supportStyle}
                  onChangeText={(value) => setDraft((s) => ({ ...s, supportStyle: value }))}
                  placeholder="Direct, calm, challenging, warm"
                />
                <Field
                  label="Best energy window"
                  value={draft.energyWindow}
                  onChangeText={(value) => setDraft((s) => ({ ...s, energyWindow: value }))}
                  placeholder="Early morning, late evening, after lunch"
                />

                <Pressable style={styles.primaryBtn} onPress={handleCreatePlan} disabled={loading}>
                  <Text style={styles.primaryBtnText}>{loading ? 'Building…' : 'Create my Pattern Map'}</Text>
                </Pressable>
              </FloatingCard>
            </View>
          ) : (
            <>
              <Text style={styles.heroTitle}>Today’s mission</Text>
              <Text style={styles.heroSub}>A premium dashboard with layered cards, evidence metrics, and adaptive next steps.</Text>

              <FloatingCard>
                <Text style={styles.cardEyebrow}>Mission</Text>
                <Text style={styles.missionTitle}>{mission.missionTitle}</Text>
                <Text style={styles.missionSubtitle}>{mission.missionSubtitle}</Text>

                <View style={styles.rule} />

                <Text style={styles.sectionTitle}>Micro-steps</Text>
                {mission.microSteps.map((step, index) => (
                  <Text key={index} style={styles.bulletLine}>
                    {index + 1}. {step}
                  </Text>
                ))}

                <View style={styles.rule} />

                <Text style={styles.captionLabel}>Why this works</Text>
                <Text style={styles.captionText}>{mission.whyItWorks}</Text>

                <Text style={styles.captionLabel}>Reward cue</Text>
                <Text style={styles.captionText}>{mission.rewardCue}</Text>

                <Text style={styles.captionLabel}>Evidence note</Text>
                <Text style={styles.captionText}>{mission.evidenceNote}</Text>
              </FloatingCard>

              <Text style={[styles.sectionHeader, { marginTop: 22 }]}>Evidence board</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsRow}>
                {metrics.map((metric) => (
                  <MetricOrb key={metric.label} label={metric.label} score={metric.score} />
                ))}
              </ScrollView>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Identity alignment trend</Text>
                <Text style={styles.chartSub}>Your recent behaviour votes, captured as evidence over time.</Text>
                <Sparkline points={liveStats.history} width={320} height={120} />
              </View>

              <View style={styles.splitRow}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Streak</Text>
                  <Text style={styles.infoNumber}>{liveStats.streakDays}</Text>
                  <Text style={styles.infoHint}>days in motion</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Completed</Text>
                  <Text style={styles.infoNumber}>{liveStats.completedMissions}</Text>
                  <Text style={styles.infoHint}>missions logged</Text>
                </View>
              </View>

              <View style={styles.patternCard}>
                <Text style={styles.sectionTitle}>Pattern map</Text>
                <Text style={styles.patternHeadline}>{patternMap.headline}</Text>

                <Text style={styles.captionLabel}>Traits</Text>
                {patternMap.traits.map((item, index) => (
                  <Text key={index} style={styles.bulletLine}>• {item}</Text>
                ))}

                <Text style={styles.captionLabel}>Risk moments</Text>
                {patternMap.riskMoments.map((item, index) => (
                  <Text key={index} style={styles.bulletLine}>• {item}</Text>
                ))}

                <Text style={styles.captionLabel}>Leverage points</Text>
                {patternMap.leveragePoints.map((item, index) => (
                  <Text key={index} style={styles.bulletLine}>• {item}</Text>
                ))}

                <Text style={styles.captionLabel}>Next shift</Text>
                <Text style={styles.captionText}>{patternMap.nextShift}</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryBtn} onPress={() => handleNextMission('too_easy')} disabled={loading || locked}>
                  <Text style={styles.secondaryBtnText}>Too easy</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => handleNextMission('right')} disabled={loading || locked}>
                  <Text style={styles.secondaryBtnText}>Right level</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => handleNextMission('too_hard')} disabled={loading || locked}>
                  <Text style={styles.secondaryBtnText}>Too hard</Text>
                </Pressable>
              </View>

              <Pressable style={[styles.primaryBtn, locked && styles.disabledBtn]} onPress={handleCompleteMission} disabled={locked}>
                <Text style={styles.primaryBtnText}>{locked ? 'Unlock Pro to log evidence' : 'Complete today’s mission'}</Text>
              </Pressable>

              {locked && (
                <View style={styles.paywallWrap}>
                  <Text style={styles.paywallTitle}>Unlock Unwall Pro</Text>
                  <Text style={styles.paywallSub}>
                    Daily adaptive missions, full evidence tracking, pattern refreshes, and ongoing rewiring reports.
                  </Text>

                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <Pressable key={pkg.identifier} style={styles.packageCard} onPress={() => handleBuy(pkg)} disabled={loading}>
                        <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                        <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                        <Text style={styles.packageMeta}>{pkg.packageType}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <>
                      <View style={styles.packageCard}>
                        <Text style={styles.packageTitle}>Monthly Pro</Text>
                        <Text style={styles.packagePrice}>Set in RevenueCat</Text>
                        <Text style={styles.packageMeta}>Link your products and offering</Text>
                      </View>
                      <View style={styles.packageCard}>
                        <Text style={styles.packageTitle}>Annual Pro</Text>
                        <Text style={styles.packagePrice}>Set in RevenueCat</Text>
                        <Text style={styles.packageMeta}>Make this the hero plan</Text>
                      </View>
                    </>
                  )}

                  <Pressable style={styles.restoreBtn} onPress={handleRestore}>
                    <Text style={styles.restoreText}>Restore purchases</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8D847A"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  brand: {
    fontSize: 32,
    color: COLORS.text,
    fontFamily: FONTS.serif,
    letterSpacing: 0.6,
  },
  tag: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.subtext,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    color: COLORS.text,
    fontFamily: FONTS.serif,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.subtext,
    marginBottom: 16,
  },
  cardEyebrow: {
    color: COLORS.olive,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '700',
  },
  missionTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: COLORS.text,
    fontFamily: FONTS.serif,
  },
  missionSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.subtext,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 24,
    color: COLORS.text,
    fontFamily: FONTS.serif,
    marginBottom: 12,
  },
  captionLabel: {
    marginTop: 14,
    marginBottom: 6,
    color: COLORS.olive,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  captionText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },
  bulletLine: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
    marginBottom: 5,
  },
  rule: {
    height: 1,
    backgroundColor: COLORS.line,
    marginVertical: 14,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.subtext,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.text,
    ...SHADOW,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.55,
  },
  metricsRow: {
    marginBottom: 18,
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '700',
  },
  chartSub: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
    color: COLORS.subtext,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    width: '48.4%',
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  infoLabel: {
    color: COLORS.subtext,
    fontSize: 13,
    marginBottom: 8,
  },
  infoNumber: {
    color: COLORS.text,
    fontSize: 34,
    fontFamily: FONTS.serif,
  },
  infoHint: {
    marginTop: 4,
    color: COLORS.subtext,
    fontSize: 12,
  },
  patternCard: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    marginBottom: 16,
  },
  patternHeadline: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 25,
    marginBottom: 8,
    fontFamily: FONTS.serif,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  secondaryBtn: {
    width: '31.5%',
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  paywallWrap: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    ...SHADOW,
  },
  paywallTitle: {
    fontSize: 28,
    color: COLORS.text,
    fontFamily: FONTS.serif,
  },
  paywallSub: {
    marginTop: 8,
    marginBottom: 14,
    color: COLORS.subtext,
    lineHeight: 21,
  },
  packageCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  packageTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
  },
  packagePrice: {
    marginTop: 4,
    fontSize: 24,
    color: COLORS.olive,
    fontFamily: FONTS.serif,
  },
  packageMeta: {
    marginTop: 4,
    color: COLORS.subtext,
    fontSize: 12,
  },
  restoreBtn: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 10,
  },
  restoreText: {
    color: COLORS.olive,
    fontWeight: '700',
  },
});
