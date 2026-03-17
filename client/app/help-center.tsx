import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ChevronDown, ChevronUp, Home,
  Briefcase, Bell, HelpCircle, MessageSquare,
} from 'lucide-react-native';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:      '#0F0F0E',
  inkMid:   '#4A4845',
  inkLight: '#9A9691',
  chalk:    '#FAFAF8',
  surface:  '#FFFFFF',
  hairline: '#E8E5DF',
  blue:     '#1D4ED8',
  blueBg:   '#EEF2FF',
};

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: 'How do I view my projects?',
    answer: 'Navigate to the Projects tab from the bottom navigation bar. You\'ll see all your active projects listed with their current status and progress.',
  },
  {
    question: 'How do I check project progress?',
    answer: 'Tap on any project to view detailed information. The Overview tab shows progress percentage and key metrics. The Updates tab shows recent progress updates from your project manager.',
  },
  {
    question: 'What are milestones?',
    answer: 'Milestones are important project phases or goals. View them in the Milestones tab on any project detail page. Completed milestones are marked, and upcoming ones show their target dates.',
  },
  {
    question: 'How do I request a project update?',
    answer: 'On any project detail page, tap the "Request Update" button. This sends a notification to your project manager who will provide you with the latest information.',
  },
  {
    question: 'How do I contact my project manager?',
    answer: 'On the project detail page, tap the mail icon in the header to send an email directly to your project manager.',
  },
  {
    question: 'What do the project statuses mean?',
    answer: 'Active means the project is in progress. On Hold means it\'s temporarily paused. Completed means it\'s finished. Each status is shown with a colored badge on the project card.',
  },
  {
    question: 'How do I view notifications?',
    answer: 'Tap the bell icon in the top right corner of the Home screen to view all your notifications — project milestones, progress updates, and announcements.',
  },
  {
    question: 'How do I pay a billing invoice?',
    answer: 'Go to the Billings tab, tap on any unpaid invoice, then tap "Pay Now" at the bottom. You\'ll be redirected to our secure payment page to complete the transaction.',
  },
];

// ── Feature item ──────────────────────────────────────────────────────────────
function FeatureRow({ icon: Icon, title, desc }: {
  icon: any; title: string; desc: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Icon size={16} color={D.blue} strokeWidth={2} />
      </View>
      <View style={styles.featureBody}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string; answer: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.faqItem, isOpen && styles.faqItemOpen]}
      onPress={onToggle}
      activeOpacity={0.75}>
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, isOpen && { color: D.ink, fontWeight: '700' }]}>
          {question}
        </Text>
        {isOpen
          ? <ChevronUp size={16} color={D.inkMid} strokeWidth={2.5} />
          : <ChevronDown size={16} color={D.inkLight} strokeWidth={2} />}
      </View>
      {isOpen && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionLabelLine} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={D.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <HelpCircle size={28} color={D.blue} strokeWidth={1.8} />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>
            Find answers to common questions about the Client Portal.
          </Text>
        </View>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <SectionLabel title="What You Can Do" />
        <View style={[styles.sectionCard, { borderLeftColor: D.blue }]}>
          <FeatureRow
            icon={Home}
            title="Home Dashboard"
            desc="Overview of all your projects, recent billings, and notifications."
          />
          <View style={styles.featureDivider} />
          <FeatureRow
            icon={Briefcase}
            title="Project Tracking"
            desc="Progress, milestones, updates, issues, and material delivery status."
          />
          <View style={styles.featureDivider} />
          <FeatureRow
            icon={Bell}
            title="Real-time Updates"
            desc="Notifications for milestones, progress reports, and announcements."
          />
          <View style={styles.featureDivider} />
          <FeatureRow
            icon={MessageSquare}
            title="Request Updates"
            desc="Send update requests directly to your project manager from any project page."
          />
        </View>

        {/* ── FAQs ─────────────────────────────────────────────────────────── */}
        <SectionLabel title="Frequently Asked Questions" />
        <View style={styles.faqList}>
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </View>

        {/* ── Contact ──────────────────────────────────────────────────────── */}
        <SectionLabel title="Need More Help?" />
        <View style={[styles.contactCard, { borderLeftColor: D.inkMid }]}>
          <Text style={styles.contactText}>
            Can’t find what you’re looking for? Reach out to your project manager directly from any project page, or contact our support team from the About tab.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: D.chalk },
  scroll:{ flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  // Header
  header: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.hairline,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: D.ink },

  // Hero
  hero: {
    alignItems: 'center', paddingVertical: 28,
  },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: D.blueBg, justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 20, fontWeight: '700', color: D.ink, letterSpacing: -0.3, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: D.inkLight, textAlign: 'center', lineHeight: 19, maxWidth: 260 },

  // Section label
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: D.inkLight, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionLabelLine:{ flex: 1, height: 1, backgroundColor: D.hairline },

  // Feature card
  sectionCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 24,
  },
  featureRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIconWrap:{
    width: 30, height: 30, borderRadius: 7,
    backgroundColor: D.blueBg, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  featureBody:  { flex: 1 },
  featureTitle: { fontSize: 13, fontWeight: '700', color: D.ink, marginBottom: 2 },
  featureDesc:  { fontSize: 12, color: D.inkMid, lineHeight: 17 },
  featureDivider: { height: 1, backgroundColor: D.hairline, marginVertical: 12 },

  // FAQ
  faqList: { gap: 8, marginBottom: 24 },
  faqItem: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, padding: 14,
  },
  faqItemOpen: { borderColor: D.ink },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 13, fontWeight: '500', color: D.inkMid, lineHeight: 19 },
  faqAnswer: {
    fontSize: 12, color: D.inkMid, lineHeight: 18,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: D.hairline,
  },

  // Contact
  contactCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  contactText: { fontSize: 13, color: D.inkMid, lineHeight: 19 },
});