import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I view my projects?',
    answer: 'Navigate to the Projects tab from the bottom navigation bar. You\'ll see all your active projects listed with their current status, progress, and budget information.',
  },
  {
    question: 'How do I check project progress?',
    answer: 'Tap on any project from the Projects tab or Home screen to view detailed information. The Overview tab shows progress percentage, budget status, and key metrics. The Updates tab shows recent progress updates from your project manager.',
  },
  {
    question: 'What are milestones?',
    answer: 'Milestones are important project phases or goals. View them in the Milestones tab on any project detail page. Completed milestones are marked with a checkmark, and upcoming ones show their target dates.',
  },
  {
    question: 'How do I request a project update?',
    answer: 'On any project detail page, tap the "Request Update" button. This sends a notification to your project manager, who will provide you with the latest information about your project.',
  },
  {
    question: 'How do I contact my project manager?',
    answer: 'On the project detail page, you can find contact options for your project manager. Tap the phone icon to call or the email icon to send an email directly.',
  },
  {
    question: 'What do the project statuses mean?',
    answer: 'Projects can have different statuses: Planning (initial phase), In Progress (active work), On Hold (temporarily paused), Completed (finished), or Cancelled. The status is shown with a colored badge on each project card.',
  },
  {
    question: 'How do I view notifications?',
    answer: 'Tap the bell icon in the top right corner of the Home screen to view all your notifications. You\'ll see updates about project milestones, progress updates, and other important information.',
  },
  {
    question: 'Can I see project budget information?',
    answer: 'Yes! On the project detail page, you can see the total budget, amount spent, and remaining budget. A progress bar shows how much of the budget has been used.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const backgroundColor = '#F3F4F6'; // gray-100
  const cardBg = '#FFFFFF'; // white
  const textColor = '#111827'; // gray-900
  const textSecondary = '#4B5563'; // gray-600
  const borderColor = '#E5E7EB'; // gray-200

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Help Center</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Welcome Section */}
        <View style={[styles.welcomeCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="help-circle" size={32} color="#3B82F6" />
          </View>
          <Text style={[styles.welcomeTitle, { color: textColor }]}>Welcome to Help Center</Text>
          <Text style={[styles.welcomeText, { color: textSecondary }]}>
            Find answers to common questions and learn how to use the Client Portal effectively.
          </Text>
        </View>

        {/* Getting Started */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Getting Started</Text>
          <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.infoText, { color: textSecondary }]}>
              The Client Portal helps you stay informed about your construction projects. Use the tabs at the bottom to navigate between Home, Projects, and About sections.
            </Text>
          </View>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Key Features</Text>
          <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="home-outline" size={20} color="#3B82F6" style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Home Dashboard</Text>
              <Text style={[styles.featureText, { color: textSecondary }]}>
                View an overview of all your projects, recent updates, and important notifications.
              </Text>
            </View>
          </View>
          <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="briefcase-outline" size={20} color="#3B82F6" style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Project Management</Text>
              <Text style={[styles.featureText, { color: textSecondary }]}>
                Access detailed information about each project including progress, milestones, and budget.
              </Text>
            </View>
          </View>
          <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="notifications-outline" size={20} color="#3B82F6" style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Real-time Updates</Text>
              <Text style={[styles.featureText, { color: textSecondary }]}>
                Receive notifications about project milestones, progress updates, and important announcements.
              </Text>
            </View>
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqCard, { backgroundColor: cardBg, borderColor }]}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}>
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: textColor }]}>{faq.question}</Text>
                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={textSecondary}
                />
              </View>
              {expandedIndex === index && (
                <Text style={[styles.faqAnswer, { color: textSecondary }]}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <View style={[styles.contactCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
            <Text style={[styles.contactTitle, { color: textColor }]}>Still need help?</Text>
            <Text style={[styles.contactText, { color: textSecondary }]}>
              If you can't find the answer you're looking for, feel free to contact our support team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
  },
  faqCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  contactCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

