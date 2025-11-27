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
import {
  Info,
  Mail,
  Globe,
  Shield,
  Code,
  Heart,
  ExternalLink,
} from 'lucide-react-native';
import { AppColors } from '@/utils/colors';
import Logo from '@/components/Logo';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  
  const handleLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Logo width={200} height={50} />
        <Text style={styles.tagline}>Task Management Made Simple</Text>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Info size={20} color={AppColors.primary} />
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            This task management application helps you stay organized and
            productive. Track your assigned tasks, update progress, and report
            issues seamlessly.
          </Text>
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Code size={20} color={AppColors.primary} />
          <Text style={styles.sectionTitle}>Features</Text>
        </View>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>
              View and manage all your assigned tasks
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>
              Add progress updates with file attachments
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>
              Report issues with priority levels
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>
              Track task history and completed work
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>
              Real-time updates and notifications
            </Text>
          </View>
        </View>
      </View>

      {/* Version Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={20} color={AppColors.primary} />
          <Text style={styles.sectionTitle}>Version</Text>
        </View>
        <View style={styles.versionCard}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionSubtext}>
            Built with React Native and Expo
          </Text>
        </View>
      </View>

      {/* Contact */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Mail size={20} color={AppColors.primary} />
          <Text style={styles.sectionTitle}>Contact & Support</Text>
        </View>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => handleLink('mailto:support@example.com')}
        >
          <Mail size={20} color={AppColors.primary} />
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Email Support</Text>
            <Text style={styles.linkSubtitle}>support@example.com</Text>
          </View>
          <ExternalLink size={16} color={AppColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => handleLink('https://example.com')}
        >
          <Globe size={20} color={AppColors.primary} />
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Visit Website</Text>
            <Text style={styles.linkSubtitle}>www.example.com</Text>
          </View>
          <ExternalLink size={16} color={AppColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Heart size={16} color={AppColors.error} fill={AppColors.error} />
          <Text style={styles.footerText}>
            Made with love by the development team
          </Text>
        </View>
        <Text style={styles.footerCopyright}>
          © 2024 All rights reserved
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
  },
  tagline: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  infoCard: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoText: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 24,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
    marginTop: 6,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: AppColors.text,
    lineHeight: 22,
  },
  versionCard: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  linkSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  footerCopyright: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
});

