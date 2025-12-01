import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDialog } from '@/contexts/DialogContext';
import { Document } from '@/data/mockData';

interface DocumentViewerProps {
  visible: boolean;
  onClose: () => void;
  documents: Document[];
  projectName: string;
}

export default function DocumentViewer({
  visible,
  onClose,
  documents,
  projectName,
}: DocumentViewerProps) {
  const dialog = useDialog();
  const backgroundColor = '#FFFFFF';
  const textColor = '#111827';
  const textSecondary = '#4B5563';
  const borderColor = '#E5E7EB';

  const getDocumentIcon = (type: string) => {
    if (type.toLowerCase().includes('pdf')) return 'document-text';
    if (type.toLowerCase().includes('image')) return 'image';
    if (type.toLowerCase().includes('word')) return 'document';
    return 'document-outline';
  };

  const handleDownload = (document: Document) => {
    dialog.showConfirm(
      `Would you like to download ${document.name}?`,
      () => {
        // In a real app, this would download the file
        dialog.showInfo('Download functionality would be implemented with file system access');
      },
      'Download Document',
      'Download',
      'Cancel'
    );
  };

  const handleView = (document: Document) => {
    dialog.showConfirm(
      `Would you like to view ${document.name}?`,
      () => {
        // In a real app, this would open the document
        dialog.showInfo('Document viewer would open here');
      },
      'View Document',
      'View',
      'Cancel'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor, borderColor }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textColor }]}>Project Documents</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>{projectName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {documents.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textColor }]}>No documents</Text>
                <Text style={[styles.emptySubtext, { color: textSecondary }]}>
                  No documents available for this project
                </Text>
              </View>
            ) : (
              documents.map((document) => (
                <View
                  key={document.id}
                  style={[styles.documentItem, { backgroundColor: '#F9FAFB', borderColor }]}>
                  <View style={styles.documentInfo}>
                    <View style={[styles.documentIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name={getDocumentIcon(document.type) as any} size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.documentDetails}>
                      <Text style={[styles.documentName, { color: textColor }]} numberOfLines={1}>
                        {document.name}
                      </Text>
                      <View style={styles.documentMeta}>
                        <Text style={[styles.documentMetaText, { color: textSecondary }]}>
                          {document.type}
                        </Text>
                        <Text style={[styles.documentMetaText, { color: textSecondary }]}> • </Text>
                        <Text style={[styles.documentMetaText, { color: textSecondary }]}>
                          {document.size}
                        </Text>
                        <Text style={[styles.documentMetaText, { color: textSecondary }]}> • </Text>
                        <Text style={[styles.documentMetaText, { color: textSecondary }]}>
                          {new Date(document.uploadDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => handleView(document)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="eye-outline" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => handleDownload(document)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="download-outline" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentMetaText: {
    fontSize: 12,
    fontWeight: '400',
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

