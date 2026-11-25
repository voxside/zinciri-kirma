import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { isLockedTask, useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import { REPEAT_LABEL, type Task } from '@/types/models';
import { CloseIcon, PencilIcon, PinIcon, TrashIcon } from './icons';

interface Props {
  task: Task | null;
  onClose: () => void;
  onEditFull: (task: Task) => void;
}

/** Uzun basınca açılan hızlı işlemler: yeniden adlandır, listeden kaldır, sil. */
export function TaskActions({ task, onClose, onEditFull }: Props) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const rules = useAppStore((s) => s.rules);
  const renameTask = useAppStore((s) => s.renameTask);
  const hideTask = useAppStore((s) => s.hideTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteRule = useAppStore((s) => s.deleteRule);

  const [title, setTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  if ((task?.id ?? null) !== shownId) {
    setShownId(task?.id ?? null);
    setTitle(task?.title ?? '');
    setConfirmDelete(false);
    setConfirmStop(false);
  }

  if (!task) return null;
  const locked = isLockedTask(task, rules);
  const rule = task.ruleId ? rules.find((r) => r.id === task.ruleId) : undefined;
  // Kullanıcının sabit görevi: kaldırılabilir (sistem kuralı hariç).
  const userRule = rule && !rule.systemKey && rule.active ? rule : undefined;
  const done = task.status === 'done';
  const renamed = title.trim().length > 0 && title.trim() !== task.title;

  const close = () => {
    if (renamed && !locked) renameTask(task.id, title);
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.handle} />

          {locked || userRule ? (
            <View style={styles.lockedRow}>
              <PinIcon size={14} color={t.cat.call} />
              <Text style={styles.lockedText}>
                {userRule
                  ? `Sabit görev · ${REPEAT_LABEL[userRule.intervalDays]}`
                  : 'Sabit kural: silinemez, her sabah yenilenir.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.renameRow}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!locked}
              style={[styles.input, locked && { color: t.textDim }]}
              placeholder="Görev adı"
              placeholderTextColor={t.textFaint}
              returnKeyType="done"
              onSubmitEditing={close}
              accessibilityLabel="Görev adı"
            />
            {renamed && !locked ? (
              <Pressable
                onPress={() => {
                  haptic.complete();
                  close();
                }}
                style={styles.saveBtn}>
                <Text style={styles.saveText}>Kaydet</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Action
              icon={<PencilIcon size={18} color={t.text} />}
              label="Tüm ayrıntıları düzenle"
              onPress={() => {
                if (renamed && !locked) renameTask(task.id, title);
                onEditFull(task);
              }}
            />
            {done ? (
              <Action
                icon={<CloseIcon size={16} color={t.text} />}
                label="Tamamlanmadı olarak geri al"
                onPress={() => {
                  toggleTask(task.id);
                  haptic.tap();
                  onClose();
                }}
              />
            ) : null}
            {done && !locked ? (
              <Action
                icon={<CloseIcon size={16} color={t.accent} />}
                label="Listeden kaldır"
                hint="Halkadaki puanı korunur."
                onPress={() => {
                  hideTask(task.id);
                  haptic.complete();
                  onClose();
                }}
              />
            ) : null}
            {!locked ? (
              <Action
                icon={<TrashIcon size={18} color={t.danger} />}
                label={confirmDelete ? 'Emin misin? Silmek için tekrar dokun' : 'Görevi sil'}
                hint={done ? 'Silinen görevin puanı halkadan düşer.' : undefined}
                danger
                onPress={() => {
                  if (!confirmDelete) {
                    haptic.tap();
                    setConfirmDelete(true);
                    return;
                  }
                  deleteTask(task.id);
                  haptic.tap();
                  onClose();
                }}
              />
            ) : null}
            {userRule ? (
              <Action
                icon={<PinIcon size={16} color={t.danger} />}
                label={confirmStop ? 'Emin misin? Kaldırmak için tekrar dokun' : 'Sabit görevi tamamen kaldır'}
                hint="Tekrar durur ve bekleyen kopyaları silinir. (“Görevi sil” yalnızca bugünkünü siler.)"
                danger
                onPress={() => {
                  if (!confirmStop) {
                    haptic.tap();
                    setConfirmStop(true);
                    return;
                  }
                  deleteRule(userRule.id);
                  haptic.tap();
                  onClose();
                }}
              />
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Action({
  icon,
  label,
  hint,
  danger,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: t.surface2 }]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionText, danger && { color: t.danger }]}>{label}</Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: t.backdrop },
  sheet: {
    backgroundColor: t.bg,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    gap: S.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.border, marginBottom: S.xs },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockedText: { color: t.cat.call, fontSize: 12.5, fontWeight: '700' },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  input: {
    flex: 1,
    backgroundColor: t.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: t.border,
    color: t.text,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: S.lg,
    paddingVertical: 13,
  },
  saveBtn: { backgroundColor: t.accent, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 14 },
  saveText: { color: t.onAccent, fontWeight: '800', fontSize: 15 },
  actions: { backgroundColor: t.surface, borderRadius: R.lg, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 15 },
  actionText: { color: t.text, fontSize: 15, fontWeight: '700' },
  actionHint: { color: t.textFaint, fontSize: 12, marginTop: 2 },
});
