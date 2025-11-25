import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { FIRM_CONTACT } from '@/constants/contact';

export default function AboutScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const backgroundColor = '#F3F4F6'; // gray-100
  const cardBg = '#FFFFFF'; // white
  const textColor = '#111827'; // gray-900
  const textSecondary = '#4B5563'; // gray-600
  const borderColor = '#E5E7EB'; // gray-200

  const InfoCard = ({
    icon,
    title,
    value,
    onPress,
  }: {
    icon: string;
    title: string;
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.infoIconContainer, { backgroundColor: '#F3F4F6' }]}>
        <Ionicons name={icon as any} size={24} color="#3B82F6" />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoTitle, { color: textSecondary }]}>{title}</Text>
        <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={20} color={textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.profileName, { color: textColor }]}>{user?.name || 'Client'}</Text>
          <Text style={[styles.profileCompany, { color: textSecondary }]}>
            {user?.company || 'Construction Client'}
          </Text>
          <Text style={[styles.profileEmail, { color: textSecondary }]}>
            {user?.email || 'client@example.com'}
          </Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Account Information</Text>
          <InfoCard icon="person-outline" title="Full Name" value={user?.name || 'N/A'} />
          <InfoCard icon="mail-outline" title="Email Address" value={user?.email || 'N/A'} />
          <InfoCard icon="business-outline" title="Company" value={user?.company || 'N/A'} />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Support & Resources</Text>
          <TouchableOpacity
            style={[styles.helpCenterCard, { backgroundColor: cardBg, borderColor }]}
            onPress={() => router.push('/help-center')}
            activeOpacity={0.7}>
            <View style={[styles.helpCenterIconContainer, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="help-circle-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.helpCenterContent}>
              <Text style={[styles.helpCenterTitle, { color: textColor }]}>Help Center</Text>
              <Text style={[styles.helpCenterText, { color: textSecondary }]}>
                Find answers to common questions and learn how to use the platform effectively.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
          </TouchableOpacity>
          <InfoCard
            icon="chatbubbles-outline"
            title="Contact Support"
            value={`${FIRM_CONTACT.email}`}
            onPress={() => Linking.openURL(`mailto:${FIRM_CONTACT.email}?subject=Support Request`)}
          />
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>About</Text>
          <View style={[styles.aboutCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.aboutTitle, { color: textColor }]}>Client Portal</Text>
            <Text style={[styles.aboutVersion, { color: textSecondary }]}>Version 1.0.0</Text>
            <Text style={[styles.aboutDescription, { color: textSecondary }]}>
              Your comprehensive construction project management portal. Track progress, view milestones, and stay updated on all your projects in one place.
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: cardBg, borderColor }]}
          onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={[styles.logoutText, { color: '#EF4444' }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondary }]}>
            © 2024 Construction Management System
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  profileCompany: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  aboutCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  aboutDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
  },
  helpCenterCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  helpCenterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  helpCenterContent: {
    flex: 1,
  },
  helpCenterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpCenterText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

