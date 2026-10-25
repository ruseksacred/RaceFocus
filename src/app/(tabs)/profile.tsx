import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import { licenceFor, NICK_MAX_LENGTH } from '@/game';
import {
  chooseNick,
  continueWithGoogle,
  createAccount,
  deleteAccount,
  resetPassword,
  signInWithEmail,
  signOutAccount,
  useAccount,
} from '@/net/account';
import { describeError, useMessages } from '@/i18n';
import { googleSignInAvailable } from '@/net/auth-setup';
import { firebaseConfigured } from '@/net/firebase';
import { useCareer } from '@/store/career';
import { usePractice } from '@/store/practice';
import { useProfile } from '@/store/profile';
import { colors, fonts, label, tabular } from '@/theme';

/** Runs an account action with a busy flag, an error message and an optional success note. */
function useAction() {
  const m = useMessages();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await action();
      if (success) setNote(success);
    } catch (e) {
      setError(describeError(m, e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, note, run };
}

export default function Profile() {
  const m = useMessages();
  const account = useAccount();

  if (!firebaseConfigured) {
    return (
      <Screen>
        <ProfileTop />
        <Text style={ui.title}>{m.profile.driver}</Text>
        <Card style={styles.card}>
          <Text style={ui.body}>{m.profile.notSetUp}</Text>
        </Card>
      </Screen>
    );
  }

  if (!account.ready) {
    return (
      <Screen>
        <ProfileTop />
        <ActivityIndicator color={colors.text} style={styles.loading} />
      </Screen>
    );
  }

  if (account.isGuest) return <GuestProfile />;
  if (account.needsNick) return <ChooseNick />;
  return <AccountProfile />;
}

/** "Profile" label with the settings button on the right. */
function ProfileTop() {
  const m = useMessages();
  return (
    <View style={styles.top}>
      <Text style={label}>{m.profile.label}</Text>
      <Link href="/settings" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={m.profile.settings} hitSlop={12} style={styles.gear}>
          <Icon name="settings" color={colors.muted} size={22} />
          <Text style={styles.gearText}>{m.profile.settings}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const m = useMessages();
  return (
    <>
      <ProfileTop />
      <View style={styles.header}>
        <Link href="/helmet" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={m.helmet.edit}>
            <Avatar size={80} />
          </Pressable>
        </Link>
        <View style={styles.headerText}>
          <Text style={ui.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Link href="/helmet" style={styles.editHelmet}>
            {m.helmet.edit} ›
          </Link>
        </View>
      </View>
    </>
  );
}

function Field({
  label: title,
  value,
  onChangeText,
  secure,
  email,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  email?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[label, styles.small]}>{title}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={email ? 'email-address' : 'default'}
        autoCapitalize={email || secure ? 'none' : 'words'}
        autoComplete={email ? 'email' : secure ? 'password' : 'off'}
        autoCorrect={false}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={title}
        style={styles.input}
      />
    </View>
  );
}

/** Short summary of the driver's stats, with a link to the full Stats screen. */
function StatsCard() {
  const m = useMessages();
  const races = useCareer((state) => state.races);
  const wins = useCareer((state) => state.wins);
  const sessions = usePractice((state) => state.totals.sessions);
  return (
    <>
      <SectionLabel>{m.profile.stats}</SectionLabel>
      <Link href="/stats" asChild>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.statsCard, pressed && styles.pressed]}>
          <View style={styles.statsRow}>
            <MiniStat title={m.profile.statRaces} value={races} />
            <MiniStat title={m.profile.statWins} value={wins} />
            <MiniStat title={m.profile.statSessions} value={sessions} />
          </View>
          <Text style={styles.statsLink}>{m.profile.allStats}</Text>
        </Pressable>
      </Link>
    </>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[label, styles.small]}>{title}</Text>
      <Text style={[styles.miniValue, tabular]}>{value}</Text>
    </View>
  );
}

function Feedback({ error, note }: { error: string | null; note: string | null }) {
  if (error)
    return (
      <Text style={styles.error} accessibilityRole="alert">
        {error}
      </Text>
    );
  if (note) return <Text style={styles.note}>{note}</Text>;
  return null;
}

function PrimaryButton({
  text,
  onPress,
  busy,
  disabled,
}: {
  text: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [styles.primary, off && styles.disabled, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{text}</Text>}
    </Pressable>
  );
}

function SecondaryButton({ text, onPress, danger }: { text: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.secondary, danger && styles.danger]}>
      <Text style={[styles.secondaryText, danger && { color: colors.red }]}>{text}</Text>
    </Pressable>
  );
}

function GuestProfile() {
  const m = useMessages();
  const guestNick = useProfile((state) => state.nick);
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [nick, setNick] = useState(guestNick);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, note, run } = useAction();

  return (
    <Screen>
      <Header title={m.profile.guestTitle} subtitle={m.profile.guestSubtitle} />
      <StatsCard />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{m.profile.saveProgress}</Text>
        <Text style={ui.body}>{m.profile.saveProgressBody}</Text>
      </Card>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['create', 'signin'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setMode(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === tab }}
            style={[styles.tab, mode === tab && styles.tabActive]}>
            <Text style={[styles.tabText, mode === tab && styles.tabTextActive]}>
              {tab === 'create' ? m.profile.createAccountTab : m.profile.signInTab}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.card}>
        {mode === 'create' && (
          <Field
            label={m.profile.nick}
            value={nick}
            onChangeText={setNick}
            maxLength={NICK_MAX_LENGTH}
            placeholder={m.common.nickPlaceholder}
          />
        )}
        <Field
          label={m.profile.email}
          value={email}
          onChangeText={setEmail}
          email
          placeholder={m.profile.emailPlaceholder}
        />
        <Field
          label={m.profile.password}
          value={password}
          onChangeText={setPassword}
          secure
          placeholder={m.profile.passwordPlaceholder}
        />
        <PrimaryButton
          text={mode === 'create' ? m.profile.createAccount : m.profile.signIn}
          busy={busy}
          disabled={!email || !password || (mode === 'create' && !nick.trim())}
          onPress={() =>
            run(() =>
              mode === 'create' ? createAccount(nick, email, password) : signInWithEmail(email, password),
            )
          }
        />
        {mode === 'signin' && (
          <Pressable
            onPress={() =>
              run(() => resetPassword(email), m.profile.resetSent(email.trim()))
            }
            disabled={!email || busy}
            accessibilityRole="button"
            style={styles.link}>
            <Text style={[styles.linkText, !email && styles.mutedText]}>
              {email ? m.profile.forgotSend : m.profile.forgotEnterEmail}
            </Text>
          </Pressable>
        )}
        <Feedback error={error} note={note} />
      </Card>

      {googleSignInAvailable && (
        <>
          <Text style={styles.or}>{m.profile.or}</Text>
          <SecondaryButton text={m.profile.google} onPress={() => run(continueWithGoogle)} />
        </>
      )}
    </Screen>
  );
}

function ChooseNick() {
  const m = useMessages();
  const [nick, setNick] = useState(useProfile.getState().nick);
  const { busy, error, note, run } = useAction();
  return (
    <Screen>
      <Header title={m.profile.almostThere} subtitle={m.profile.pickNick} />
      <Card style={styles.card}>
        <Field
          label={m.profile.nick}
          value={nick}
          onChangeText={setNick}
          maxLength={NICK_MAX_LENGTH}
          placeholder={m.common.nickPlaceholder}
        />
        <Text style={ui.body}>{m.profile.nickUnique}</Text>
        <PrimaryButton
          text={m.profile.saveNick}
          busy={busy}
          disabled={!nick.trim()}
          onPress={() => run(() => chooseNick(nick))}
        />
        <Feedback error={error} note={note} />
      </Card>
      <SecondaryButton text={m.profile.signOut} onPress={() => run(signOutAccount)} />
    </Screen>
  );
}

function AccountProfile() {
  const m = useMessages();
  const nick = useProfile((state) => state.nick);
  const { email, provider } = useAccount();
  const rating = useCareer((state) => state.rating);
  const ratedRaces = useCareer((state) => state.ratedRaces);
  const [editing, setEditing] = useState(false);
  const [newNick, setNewNick] = useState(nick);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { busy, error, note, run } = useAction();

  return (
    <Screen>
      <Header title={nick || m.profile.driver} subtitle={m.profile.licence(licenceFor(rating, ratedRaces))} />

      <StatsCard />

      <SectionLabel>{m.profile.rating}</SectionLabel>
      <Card style={[styles.card, styles.ratingRow]}>
        <View>
          <Text style={[styles.rating, tabular]}>{Math.round(rating)}</Text>
          <Text style={ui.body}>{m.profile.ratedRaces(ratedRaces)}</Text>
        </View>
        <Text style={styles.beta}>{m.profile.ratingBeta}</Text>
      </Card>

      <SectionLabel>{m.profile.account}</SectionLabel>
      <Card style={styles.card}>
        <Text style={ui.body}>
          {provider === 'google' ? m.profile.signedInGoogle : m.profile.signedInEmail}
          <Text style={styles.strong}>{email}</Text>
          {m.profile.cloudNote}
        </Text>
        {editing ? (
          <>
            <Field label={m.profile.newNick} value={newNick} onChangeText={setNewNick} maxLength={NICK_MAX_LENGTH} />
            <PrimaryButton
              text={m.profile.saveNick}
              busy={busy}
              disabled={!newNick.trim() || newNick.trim() === nick}
              onPress={() =>
                run(async () => {
                  await chooseNick(newNick);
                  setEditing(false);
                }, m.profile.nickSaved)
              }
            />
          </>
        ) : (
          <SecondaryButton
            text={m.profile.changeNick}
            onPress={() => {
              setNewNick(nick);
              setEditing(true);
            }}
          />
        )}
        <Feedback error={error} note={note} />
      </Card>

      <SecondaryButton text={m.profile.signOut} onPress={() => run(signOutAccount)} />

      {confirmDelete ? (
        <Card style={[styles.card, styles.deleteCard]}>
          <Text style={styles.cardTitle}>{m.profile.deleteTitle}</Text>
          <Text style={ui.body}>{m.profile.deleteBody}</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <SecondaryButton text={m.common.cancel} onPress={() => setConfirmDelete(false)} />
            </View>
            <View style={styles.flex}>
              <SecondaryButton text={m.profile.deleteForGood} danger onPress={() => run(deleteAccount)} />
            </View>
          </View>
        </Card>
      ) : (
        <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.link}>
          <Text style={[styles.linkText, styles.mutedText]}>{m.profile.deleteAccount}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  statsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  statsRow: { flexDirection: 'row' },
  miniStat: { flex: 1, gap: 2 },
  miniValue: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
  statsLink: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gearText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  headerText: { flex: 1, minWidth: 0 },
  subtitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  editHelmet: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginTop: 4 },
  card: { padding: 16, gap: 12, marginTop: 16 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  small: { fontSize: 11 },
  field: { gap: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.surface2, borderColor: colors.red },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  tabTextActive: { color: colors.text },
  primary: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.5, color: colors.white },
  secondary: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  danger: { borderColor: colors.red },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  link: { paddingVertical: 10, alignItems: 'center' },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, textAlign: 'center' },
  mutedText: { color: colors.muted },
  or: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 16 },
  error: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.yellow },
  note: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  strong: { fontFamily: fonts.bodySemi, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rating: { fontFamily: fonts.heading, fontSize: 48, lineHeight: 52, color: colors.text },
  beta: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  deleteCard: { borderColor: colors.red },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
