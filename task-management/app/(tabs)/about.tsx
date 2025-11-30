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
import { User, Mail, HelpCircle, MessageCircle, LogOut, ChevronRight, Info } from 'lucide-react-native';
import { AppColors } from '@/utils/colors';
import { FIRM_CONTACT } from '@/constants/contact';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';

export default function AboutScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const backgroundColor = AppColors.background;
  const cardBg = AppColors.card;
  const textColor = AppColors.text;
  const textSecondary = AppColors.textSecondary;
  const borderColor = AppColors.border;

  const InfoCard = ({
    icon: Icon,
    title,
    value,
    onPress,
  }: {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    title: string;
    value: string;
    onPress?: () => void;
  }) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIconContainer, { backgroundColor: backgroundColor }]}>
        <Icon size={24} color={AppColors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoTitle, { color: textSecondary }]}>{title}</Text>
        <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
      </View>
      {onPress && <ChevronRight size={20} color={textSecondary} />}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border, paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textColor }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            {user?.email || 'user@example.com'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Account Information */}
        <AnimatedView delay={100}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Account Information</Text>
            <AnimatedCard index={0} delay={150}>
              <InfoCard icon={User} title="Full Name" value={user?.name || 'N/A'} />
            </AnimatedCard>
            <AnimatedCard index={1} delay={200}>
              <InfoCard icon={Mail} title="Email Address" value={user?.email || 'N/A'} />
            </AnimatedCard>
          </View>
        </AnimatedView>

        {/* Support */}
        <AnimatedView delay={250}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Support & Resources</Text>
            <AnimatedCard
              index={0}
              delay={300}
              onPress={() => router.push('/help-center')}
              style={styles.helpCenterCard}
            >
              <View style={[styles.helpCenterIconContainer, { backgroundColor: backgroundColor }]}>
                <HelpCircle size={24} color={AppColors.primary} />
              </View>
              <View style={styles.helpCenterContent}>
                <Text style={[styles.helpCenterTitle, { color: textColor }]}>Help Center</Text>
                <Text style={[styles.helpCenterText, { color: textSecondary }]}>
                  Find answers to common questions and learn how to use the platform effectively.
                </Text>
              </View>
              <ChevronRight size={20} color={textSecondary} />
            </AnimatedCard>
            <AnimatedCard index={1} delay={350}>
              <InfoCard
                icon={MessageCircle}
                title="Contact Support"
                value={FIRM_CONTACT.email}
                onPress={() => Linking.openURL(`mailto:${FIRM_CONTACT.email}?subject=Support Request`)}
              />
            </AnimatedCard>
          </View>
        </AnimatedView>

        {/* App Information */}
        <AnimatedView delay={400}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>About</Text>
            <AnimatedCard index={0} delay={450}>
              <View>
                <Text style={[styles.aboutTitle, { color: textColor }]}>Task Management</Text>
                <Text style={[styles.aboutVersion, { color: textSecondary }]}>Version 1.0</Text>
                <Text style={[styles.aboutDescription, { color: textSecondary }]}>
                  Your comprehensive task management application. Track your assigned tasks, update progress, and report issues seamlessly.
                </Text>
              </View>
            </AnimatedCard>
          </View>
        </AnimatedView>

        {/* Logout */}
        <AnimatedView delay={500}>
          <AnimatedCard
            index={0}
            delay={550}
            onPress={logout}
            style={styles.logoutButton}
          >
            <LogOut size={20} color={AppColors.error} />
            <Text style={[styles.logoutText, { color: AppColors.error }]}>Sign Out</Text>
          </AnimatedCard>
        </AnimatedView>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondary }]}>
            © Abdurauf Sawadjaan Engineering Consultancy
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
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
