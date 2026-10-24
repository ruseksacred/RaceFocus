import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import { colors, fonts, label } from '@/theme';

export default function Profile() {
  return (
    <Screen>
      <Text style={label}>Profile</Text>
      <View style={styles.header}>
        <Avatar size={72} />
        <View style={styles.headerText}>
          <Text style={ui.title}>Driver</Text>
          <Text style={styles.licence}>Licence · Rookie</Text>
        </View>
      </View>

      <SectionLabel>Account</SectionLabel>
      <Card style={styles.card}>
        <Text style={ui.body}>
          Accounts come later. Then your records, races and rating will follow you to any device.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  headerText: { flex: 1 },
  licence: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  card: { padding: 16 },
});
