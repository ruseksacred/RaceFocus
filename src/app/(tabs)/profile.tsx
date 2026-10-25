import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
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
import { googleSignInAvailable } from '@/net/auth-setup';
import { firebaseConfigured } from '@/net/firebase';
import { useCareer } from '@/store/career';
import { useProfile } from '@/store/profile';
import { colors, fonts, label, tabular } from '@/theme';

/** Runs an account action with a busy flag, an error message and an optional success note. */
function useAction() {
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
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, note, run };
}

export default function Profile() {
  const account = useAccount();

  if (!firebaseConfigured) {
    return (
      <Screen>
        <Text style={label}>Profile</Text>
        <Text style={ui.title}>Driver</Text>
        <Card style={styles.card}>
          <Text style={ui.body}>Accounts need the race server, which is not set up in this build.</Text>
        </Card>
      </Screen>
    );
  }

  if (!account.ready) {
    return (
      <Screen>
        <ActivityIndicator color={colors.text} style={styles.loading} />
      </Screen>
    );
  }

  if (account.isGuest) return <GuestProfile />;
  if (account.needsNick) return <ChooseNick />;
  return <AccountProfile />;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <Text style={label}>Profile</Text>
      <View style={styles.header}>
        <Avatar size={72} />
        <View style={styles.headerText}>
          <Text style={ui.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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
  const guestNick = useProfile((state) => state.nick);
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [nick, setNick] = useState(guestNick);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, note, run } = useAction();

  return (
    <Screen>
      <Header title="Guest driver" subtitle="Records are saved on this device" />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Save your progress</Text>
        <Text style={ui.body}>
          With an account your records, race stats and rating (beta) are kept in the cloud and follow you to
          any device. Everything you have driven as a guest moves into the new account.
        </Text>
      </Card>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['create', 'signin'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.tab, mode === m && styles.tabActive]}>
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'create' ? 'Create account' : 'Sign in'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.card}>
        {mode === 'create' && (
          <Field
            label="Nick"
            value={nick}
            onChangeText={setNick}
            maxLength={NICK_MAX_LENGTH}
            placeholder="e.g. Max"
          />
        )}
        <Field label="E-mail" value={email} onChangeText={setEmail} email placeholder="you@example.com" />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secure
          placeholder="At least 6 characters"
        />
        <PrimaryButton
          text={mode === 'create' ? 'CREATE ACCOUNT' : 'SIGN IN'}
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
              run(() => resetPassword(email), `We sent a link to reset your password to ${email.trim()}.`)
            }
            disabled={!email || busy}
            accessibilityRole="button"
            style={styles.link}>
            <Text style={[styles.linkText, !email && styles.mutedText]}>
              {email ? 'Forgot password? Send a reset link' : 'Forgot password? Enter your e-mail first'}
            </Text>
          </Pressable>
        )}
        <Feedback error={error} note={note} />
      </Card>

      {googleSignInAvailable && (
        <>
          <Text style={styles.or}>or</Text>
          <SecondaryButton text="Continue with Google" onPress={() => run(continueWithGoogle)} />
        </>
      )}
    </Screen>
  );
}

function ChooseNick() {
  const [nick, setNick] = useState(useProfile.getState().nick);
  const { busy, error, note, run } = useAction();
  return (
    <Screen>
      <Header title="Almost there" subtitle="Pick the nick other drivers will see" />
      <Card style={styles.card}>
        <Field
          label="Nick"
          value={nick}
          onChangeText={setNick}
          maxLength={NICK_MAX_LENGTH}
          placeholder="e.g. Max"
        />
        <Text style={ui.body}>Every driver has a different nick. You can change it later.</Text>
        <PrimaryButton
          text="SAVE NICK"
          busy={busy}
          disabled={!nick.trim()}
          onPress={() => run(() => chooseNick(nick))}
        />
        <Feedback error={error} note={note} />
      </Card>
      <SecondaryButton text="Sign out" onPress={() => run(signOutAccount)} />
    </Screen>
  );
}

function AccountProfile() {
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
      <Header title={nick || 'Driver'} subtitle={`Licence · ${licenceFor(rating, ratedRaces)}`} />

      <SectionLabel>Rating</SectionLabel>
      <Card style={[styles.card, styles.ratingRow]}>
        <View>
          <Text style={[styles.rating, tabular]}>{Math.round(rating)}</Text>
          <Text style={ui.body}>
            {ratedRaces} rated {ratedRaces === 1 ? 'race' : 'races'}
          </Text>
        </View>
        <Text style={styles.beta}>β Beta: rating from private rooms, may still change</Text>
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card style={styles.card}>
        <Text style={ui.body}>
          Signed in {provider === 'google' ? 'with Google' : 'with e-mail'} as{' '}
          <Text style={styles.strong}>{email}</Text>. Records, stats and rating are saved in the cloud.
        </Text>
        {editing ? (
          <>
            <Field label="New nick" value={newNick} onChangeText={setNewNick} maxLength={NICK_MAX_LENGTH} />
            <PrimaryButton
              text="SAVE NICK"
              busy={busy}
              disabled={!newNick.trim() || newNick.trim() === nick}
              onPress={() =>
                run(async () => {
                  await chooseNick(newNick);
                  setEditing(false);
                }, 'Nick saved.')
              }
            />
          </>
        ) : (
          <SecondaryButton
            text="Change nick"
            onPress={() => {
              setNewNick(nick);
              setEditing(true);
            }}
          />
        )}
        <Feedback error={error} note={note} />
      </Card>

      <SecondaryButton text="Sign out" onPress={() => run(signOutAccount)} />

      {confirmDelete ? (
        <Card style={[styles.card, styles.deleteCard]}>
          <Text style={styles.cardTitle}>Delete account?</Text>
          <Text style={ui.body}>
            This removes your account, nick, records, race history and rating for good. It cannot be undone.
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <SecondaryButton text="Cancel" onPress={() => setConfirmDelete(false)} />
            </View>
            <View style={styles.flex}>
              <SecondaryButton text="Delete for good" danger onPress={() => run(deleteAccount)} />
            </View>
          </View>
        </Card>
      ) : (
        <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.link}>
          <Text style={[styles.linkText, styles.mutedText]}>Delete account</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  headerText: { flex: 1, minWidth: 0 },
  subtitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
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
