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
import { HelpCircle, ChevronDown, ChevronUp, Home, CheckSquare, Clock, MessageCircle } from 'lucide-react-native';
import { AppColors } from '@/utils/colors';
import { ArrowLeft } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I view my tasks?',
    answer: 'Navigate to the Tasks tab from the bottom navigation bar. You\'ll see all your assigned tasks listed with their current status, due dates, and priority levels.',
  },
  {
    question: 'How do I update task progress?',
    answer: 'Tap on any task to view its details. From the task detail page, you can add progress updates, attach files, and report issues. Use the "Add Progress Update" button to submit your updates.',
  },
  {
    question: 'What are task statuses?',
    answer: 'Tasks can have different statuses: Pending (not started), In Progress (actively working), or Completed (finished). You can update the status from the task detail page.',
  },
  {
    question: 'How do I report an issue?',
    answer: 'On any task detail page, tap the "Report Issue" button. Fill in the issue title, description, and priority level. This will notify your project manager about the problem.',
  },
  {
    question: 'Can I attach files to progress updates?',
    answer: 'Yes! When adding a progress update, you can attach files such as images, documents, or other relevant materials. These files help provide context for your work.',
  },
  {
    question: 'How do I view my task history?',
    answer: 'Navigate to the History tab from the bottom navigation bar. Here you can see all your completed tasks, organized by completion date.',
  },
  {
    question: 'What do priority levels mean?',
    answer: 'Tasks can have different priority levels: Low (can be done later), Medium (normal priority), High (important), or Critical (urgent). Priority helps you prioritize your work.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Go to the About tab and tap "Contact Support" to send an email to our support team. You can also find answers to common questions in the Help Center.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const backgroundColor = AppColors.background;
  const cardBg = AppColors.card;
  const textColor = AppColors.text;
  const textSecondary = AppColors.textSecondary;
  const borderColor = AppColors.border;

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
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Help Center</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Welcome Section */}
        <AnimatedView delay={100}>
          <AnimatedCard index={0} delay={150} style={styles.welcomeCard}>
            <View style={[styles.iconContainer, { backgroundColor: AppColors.primary + '20' }]}>
              <HelpCircle size={32} color={AppColors.primary} />
            </View>
            <Text style={[styles.welcomeTitle, { color: textColor }]}>Welcome to Help Center</Text>
            <Text style={[styles.welcomeText, { color: textSecondary }]}>
              Find answers to common questions and learn how to use the Task Management app effectively.
            </Text>
          </AnimatedCard>
        </AnimatedView>

        {/* Getting Started */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Getting Started</Text>
          <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.infoText, { color: textSecondary }]}>
              The Task Management app helps you stay organized and productive. Use the tabs at the bottom to navigate between Home, Tasks, History, and About sections.
            </Text>
          </View>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Key Features</Text>
          <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
            <Home size={20} color={AppColors.primary} style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Home Dashboard</Text>
              <Text style={[styles.featureText, { color: textSecondary }]}>
                View an overview of all your tasks, statistics, and quick actions to get started.
              </Text>
            </View>
          </View>
          <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
            <CheckSquare size={20} color={AppColors.primary} style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Task Management</Text>
              <Text style={[styles.featureText, { color: textSecondary }]}>
                View and manage all your assigned tasks. Update progress, attach files, and report issues.
              </Text>
            </View>
          </View>
          <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
            <Clock size={20} color={AppColors.primary} style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Task History</Text>
              <Text style={[styles.featureText, { color: textSecondary }]}>
                Review all your completed tasks and track your work history over time.
              </Text>
            </View>
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <AnimatedCard
              key={index}
              index={index}
              delay={400 + index * 50}
              onPress={() => toggleFAQ(index)}
              style={styles.faqCard}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: textColor }]}>{faq.question}</Text>
                {expandedIndex === index ? (
                  <ChevronUp size={20} color={textSecondary} />
                ) : (
                  <ChevronDown size={20} color={textSecondary} />
                )}
              </View>
              {expandedIndex === index && (
                <Text style={[styles.faqAnswer, { color: textSecondary }]}>{faq.answer}</Text>
              )}
            </AnimatedCard>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <View style={[styles.contactCard, { backgroundColor: cardBg, borderColor }]}>
            <MessageCircle size={24} color={AppColors.primary} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  welcomeCard: {
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

