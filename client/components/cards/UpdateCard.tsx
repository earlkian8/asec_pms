import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AnimatedCard from '@/components/AnimatedCard';
import { AppColors } from '@/constants/colors';
import { ProgressUpdate } from '@/hooks/useProjectDetail';
import { API_BASE_URL } from '@/services/api';

interface UpdateCardProps {
  update: ProgressUpdate;
  index: number;
}

const updateTypeColors: Record<string, { bg: string; icon: string }> = {
  request: { bg: '#F59E0B', icon: 'chatbubble-ellipses' },
  progress: { bg: '#3B82F6', icon: 'trending-up' },
  milestone: { bg: '#10B981', icon: 'flag' },
  issue: { bg: '#EF4444', icon: 'alert-circle' },
  general: { bg: '#8B5CF6', icon: 'information-circle' },
};

export default function UpdateCard({ update, index }: UpdateCardProps) {
  const updateType = updateTypeColors[update.type] || updateTypeColors.general;

  return (
    <AnimatedCard
      index={index}
      delay={100}
      style={[styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${updateType.bg}15` }]}>
          <Ionicons name={updateType.icon as any} size={20} color={updateType.bg} />
        </View>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: AppColors.text },
              !update.title && styles.placeholderText,
            ]}>
            {update.title || 'Untitled Update'}
          </Text>
          <Text style={[styles.date, { color: AppColors.textSecondary }]}>
            {new Date(update.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            • {update.author || 'Unknown Author'}
          </Text>
          {(update.taskName || update.milestoneName) && (
            <View style={styles.context}>
              {update.milestoneName && (
                <View style={styles.contextItem}>
                  <Ionicons name="flag-outline" size={12} color={AppColors.textSecondary} />
                  <Text style={[styles.contextText, { color: AppColors.textSecondary }]}>
                    {update.milestoneName}
                  </Text>
                </View>
              )}
              {update.taskName && (
                <View style={styles.contextItem}>
                  <Ionicons name="list-outline" size={12} color={AppColors.textSecondary} />
                  <Text style={[styles.contextText, { color: AppColors.textSecondary }]}>
                    {update.taskName}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.description,
          { color: AppColors.textSecondary },
          !update.description && styles.placeholderText,
        ]}>
        {update.description || 'No description provided for this update.'}
      </Text>
      {update.file && update.file.type?.startsWith('image/') && update.file.url && (
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: update.file.url.startsWith('http')
                ? update.file.url
                : `${API_BASE_URL.replace('/api', '')}${update.file.url}`,
            }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
          />
        </View>
      )}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  date: {
    fontSize: 11,
    fontWeight: '400',
  },
  context: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  imageContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#F9FAFB',
  },
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
