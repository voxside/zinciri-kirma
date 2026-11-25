import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { addDays } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { isLockedTask, useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import {
  CATEGORIES,
  CATEGORY_SHORT,
  type Currency,
  CURRENCY_SYMBOL,
  type Level3,
  REPEAT_SHORT,
  type RepeatInterval,
  type Task,
  type TaskCategory,
  type TaskFace,
} from '@/types/models';
import { TrashIcon } from './icons';
import { Chip, DatePicker, TimePicker } from './pickers';
import { CategoryIcon, Segmented } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialCategory?: TaskCategory;
  initialFace?: TaskFace;
  editing?: Task | null;
}

type Repeat = 'once' | `${RepeatInterval}`;

const LEVELS: { value: Level3; label: string }[] = [
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
];
const MINUTES = [2, 5, 15, 30, 60];
const EFFORT_HOURS = [1, 2, 4, 8, 16, 40];
const SPAN_DAYS = [1, 3, 5, 7, 14, 30];
const PLACEHOLDER: Record<TaskCategory, string> = {
  todo: 'Hangi rutin / iş?',
  project: 'Proje ya da proje görevi başlığı',
  shopping: 'Ne alınacak?',
  call: 'Kim aranacak? (örn. Ahmet’i ara)',
};

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Ekleme / düzenleme paneli — her kategori kendi alanlarını gösterir. */
export function TaskSheet({ visible, onClose, initialCategory = 'todo', initialFace = 'front', editing }: Props) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const addTask = useAppStore((s) => s.addTask);
  const addRule = useAppStore((s) => s.addRule);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const today = useAppStore((s) => s.today);
  const locked = useAppStore((s) => (editing ? isLockedTask(editing, s.rules) : false));

  const [category, setCategory] = useState<TaskCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Level3>('medium');
  const [energy, setEnergy] = useState<Level3>('medium');
  const [minutes, setMinutes] = useState<number | undefined>();
  const [time, setTime] = useState<string | undefined>();
  const [face, setFace] = useState<TaskFace>('front');
  const [repeat, setRepeat] = useState<Repeat>('once');
  const [forToday, setForToday] = useState(true);
  const [critical, setCritical] = useState(false);
  // Alınacaklar
  const [quantity, setQuantity] = useState('');
  const [dueDate, setDueDate] = useState<string | undefined>();
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [notes, setNotes] = useState('');
  // Aranacaklar
  const [phone, setPhone] = useState('');
  // Projeler
  const [effortHours, setEffortHours] = useState('');
  const [spanDays, setSpanDays] = useState('');

  // Panel her açıldığında formu sıfırla (render sırasında durum ayarlama kalıbı).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const e = editing;
      const cat = e?.category ?? initialCategory;
      setCategory(cat);
      setTitle(e?.title ?? '');
      setPriority(e?.priority ?? 'medium');
      setEnergy(e?.energyRequired ?? 'medium');
      setMinutes(e?.estMinutes);
      setTime(e?.dueTime);
      setFace(e?.face ?? initialFace);
      setRepeat('once');
      setForToday(e ? e.planDate === today : cat === 'todo' || cat === 'call');
      setCritical(e?.isMinimum ?? false);
      setQuantity(e?.quantity ?? '');
      setDueDate(e?.dueDate);
      setPrice(e?.price != null ? String(e.price) : '');
      setCurrency(e?.currency ?? 'TRY');
      setNotes(e?.notes ?? '');
      setPhone(e?.contactPhone ?? '');
      setEffortHours(e?.effortMinutes ? String(+(e.effortMinutes / 60).toFixed(1)) : '');
      setSpanDays(e?.spanDays ? String(e.spanDays) : '');
    }
  }

  const changeCategory = (c: TaskCategory) => {
    setCategory(c);
    if (!editing) setForToday(c === 'todo' || c === 'call');
    if (c === 'project' && !dueDate) setDueDate(addDays(today, 7));
  };

  const isDaily = category === 'todo' || category === 'call';
  const canSave = title.trim().length > 0;

  const resetForNext = () => {
    setTitle('');
    setQuantity('');
    setPrice('');
    setNotes('');
    setPhone('');
    setCritical(false);
  };

  const save = (keepOpen: boolean) => {
    if (!canSave) return;
    const cleanPhone = category === 'call' && phone.trim() ? phone.trim() : undefined;

    if (!editing && isDaily && repeat !== 'once') {
      addRule({
        category,
        face,
        title: title.trim(),
        intervalDays: Number(repeat) as RepeatInterval,
        priority,
        energyRequired: energy,
        estMinutes: minutes,
        dueTime: time,
        contactPhone: cleanPhone,
        isMinimum: critical,
      });
    } else {
      const effort = num(effortHours);
      const span = num(spanDays);
      const fields: Partial<Task> & Pick<Task, 'category' | 'title'> = {
        category,
        title: title.trim(),
        priority,
        face: isDaily ? face : 'front',
        energyRequired: energy,
        estMinutes: isDaily ? minutes : undefined,
        dueTime: isDaily ? time : undefined,
        dueDate: category === 'shopping' || category === 'project' ? dueDate : undefined,
        quantity: category === 'shopping' && quantity.trim() ? quantity.trim() : undefined,
        price: category === 'shopping' ? num(price) : undefined,
        currency: category === 'shopping' && num(price) ? currency : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        contactPhone: cleanPhone,
        effortMinutes: category === 'project' && effort ? Math.round(effort * 60) : undefined,
        spanDays: category === 'project' && span ? Math.round(span) : undefined,
        progress: category === 'project' ? (editing?.progress ?? 0) : undefined,
        // Projeler zincire doğrudan sayılmaz ("Bugüne ekle" ile oturum eklenir).
        planDate: category === 'project' ? null : forToday ? today : null,
        isMinimum: isDaily ? critical : false,
      };
      if (editing) updateTask(editing.id, fields);
      else addTask(fields);
    }
    haptic.complete();
    if (keepOpen) resetForNext();
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: S.lg, paddingBottom: S.sm }}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>{editing ? 'Düzenle' : 'Yeni'}</Text>
              {editing && !locked ? (
                <Pressable
                  hitSlop={10}
                  accessibilityLabel="Sil"
                  onPress={() => {
                    deleteTask(editing.id);
                    haptic.tap();
                    onClose();
                  }}>
                  <TrashIcon size={20} color={t.danger} />
                </Pressable>
              ) : null}
            </View>

            {!locked ? (
              <Segmented
                value={category}
                onChange={changeCategory}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: CATEGORY_SHORT[c],
                  color: t.cat[c],
                  icon: <CategoryIcon category={c} size={13} color={c === category ? t.cat[c] : t.textDim} />,
                }))}
              />
            ) : (
              <Text style={styles.lockedNote}>📌 Sabit kural: adı ve kategorisi değiştirilemez, silinemez.</Text>
            )}

            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!locked}
              placeholder={PLACEHOLDER[category]}
              placeholderTextColor={t.textFaint}
              style={styles.input}
              autoFocus={!editing}
              returnKeyType="done"
              onSubmitEditing={() => save(!editing)}
              submitBehavior="submit"
            />

            {/* ── Rutin & Aranacaklar ─────────────────────────── */}
            {category === 'call' ? (
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Telefon numarası (örn. +90 5xx xxx xx xx)"
                placeholderTextColor={t.textFaint}
                keyboardType="phone-pad"
                autoComplete="tel"
                style={[styles.input, styles.inputSmall]}
              />
            ) : null}

            {isDaily ? (
              <Field label="Yapacağım saat" hint="Saat verirsen liste ve “Şimdi bunu yap” bu saate göre sıralanır.">
                <TimePicker value={time} onChange={setTime} />
              </Field>
            ) : null}

            {isDaily && !editing ? (
              <Field label={category === 'call' ? 'Aranma sıklığı' : 'Tekrar'}>
                <Segmented<Repeat>
                  value={repeat}
                  onChange={setRepeat}
                  options={[
                    { value: 'once', label: 'Tek sefer', color: t.primary },
                    ...([1, 3, 7, 14] as const).map((n) => ({
                      value: String(n) as Repeat,
                      label: REPEAT_SHORT[n],
                      color: t.primary,
                    })),
                  ]}
                />
                {repeat !== 'once' ? (
                  <Text style={styles.fieldHint}>📌 Sabit görev olur ve kendiliğinden tekrar eder. Uzun basıp istediğin zaman kaldırabilirsin.</Text>
                ) : null}
              </Field>
            ) : null}

            {/* ── Projeler ─────────────────────────────────────── */}
            {category === 'project' ? (
              <>
                <Field label="Tahmini süre (efor, saat)">
                  <View style={styles.inline}>
                    <TextInput
                      value={effortHours}
                      onChangeText={setEffortHours}
                      placeholder="örn. 6"
                      placeholderTextColor={t.textFaint}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.inputSmall, styles.numInput]}
                    />
                    <Text style={styles.unit}>saat</Text>
                  </View>
                  <View style={styles.chips}>
                    {EFFORT_HOURS.map((h) => (
                      <Chip key={h} label={`${h} sa`} active={num(effortHours) === h} onPress={() => setEffortHours(String(h))} />
                    ))}
                  </View>
                </Field>
                <Field label="Bitiş süresi (kaç güne yayılacak)">
                  <View style={styles.inline}>
                    <TextInput
                      value={spanDays}
                      onChangeText={setSpanDays}
                      placeholder="örn. 5"
                      placeholderTextColor={t.textFaint}
                      keyboardType="number-pad"
                      style={[styles.input, styles.inputSmall, styles.numInput]}
                    />
                    <Text style={styles.unit}>gün</Text>
                  </View>
                  <View style={styles.chips}>
                    {SPAN_DAYS.map((d) => (
                      <Chip
                        key={d}
                        label={`${d} gün`}
                        active={num(spanDays) === d}
                        onPress={() => {
                          setSpanDays(String(d));
                          if (!dueDate || dueDate < addDays(today, d)) setDueDate(addDays(today, d));
                        }}
                      />
                    ))}
                  </View>
                </Field>
                <Field label="Teslim tarihi (deadline)">
                  <DatePicker value={dueDate} onChange={setDueDate} today={today} />
                </Field>
              </>
            ) : null}

            {/* ── Alınacaklar ─────────────────────────────────── */}
            {category === 'shopping' ? (
              <>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Miktar (isteğe bağlı) — örn. 2 lt"
                  placeholderTextColor={t.textFaint}
                  style={[styles.input, styles.inputSmall]}
                />
                <Field label="Hedef alınma tarihi" hint="Son 3 gün kala ana ekrandaki halkanın arka yüzünde uyarı çıkar.">
                  <DatePicker value={dueDate} onChange={setDueDate} today={today} allowClear />
                </Field>
                <Field label="Fiyat">
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="Tahmini tutar"
                    placeholderTextColor={t.textFaint}
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.inputSmall]}
                  />
                  <Segmented<Currency>
                    value={currency}
                    onChange={setCurrency}
                    options={(['TRY', 'USD', 'EUR'] as const).map((c) => ({
                      value: c,
                      label: `${CURRENCY_SYMBOL[c]} ${c}`,
                      color: t.accent,
                    }))}
                  />
                </Field>
                <Field label="Notlar">
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={'Hesap, taksit seçenekleri, mağaza karşılaştırması…\nörn. A mağaza 1.299 ₺ · 6 taksit 216 ₺'}
                    placeholderTextColor={t.textFaint}
                    multiline
                    textAlignVertical="top"
                    style={[styles.input, styles.inputSmall, styles.notes]}
                  />
                </Field>
              </>
            ) : null}

            {/* ── Ortak ────────────────────────────────────────── */}
            <Field label="Öncelik">
              <Segmented value={priority} onChange={setPriority} options={LEVELS.map((l) => ({ ...l, color: t.prio[l.value] }))} />
            </Field>

            {category === 'todo' ? (
              <Field label="Gereken enerji">
                <Segmented value={energy} onChange={setEnergy} options={LEVELS.map((l) => ({ ...l, color: t.gold }))} />
              </Field>
            ) : null}

            {isDaily ? (
              <Field label="Tahmini süre">
                <View style={styles.chips}>
                  {MINUTES.map((m) => (
                    <Chip key={m} label={`${m} dk`} active={minutes === m} onPress={() => setMinutes(minutes === m ? undefined : m)} />
                  ))}
                </View>
              </Field>
            ) : null}

            {isDaily ? (
              <ToggleRow
                label="Zincirin arka yüzü (güne özel)"
                hint="Sadece bugüne özgü, tek seferlik / niş iş. Halkayı çevirince görünür."
                value={face === 'back'}
                onChange={(v) => setFace(v ? 'back' : 'front')}
              />
            ) : null}
            {category !== 'project' && repeat === 'once' ? (
              <ToggleRow
                label="Bugünün halkasına ekle"
                hint="Kapalıysa listede bekler, zincire sayılmaz."
                value={forToday}
                onChange={setForToday}
              />
            ) : null}
            {isDaily ? (
              <ToggleRow
                label="⭐ Kritik görev"
                hint="Zor gün modunda halkayı tek başına kurtaran görevlerden."
                value={critical}
                onChange={(v) => {
                  setCritical(v);
                  if (v) setForToday(true);
                }}
              />
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {!editing ? (
              <Pressable
                disabled={!canSave}
                onPress={() => save(true)}
                style={[styles.btn, styles.btnGhost, !canSave && styles.btnDisabled]}>
                <Text style={styles.btnGhostText}>Ekle + yeni</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={!canSave}
              onPress={() => save(false)}
              style={[styles.btn, styles.btnPrimary, !canSave && styles.btnDisabled]}>
              <Text style={styles.btnPrimaryText}>{editing ? 'Kaydet' : 'Ekle'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: S.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.fieldHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic.tap();
          onChange(v);
        }}
        trackColor={{ true: t.primary, false: t.surface2 }}
        thumbColor="#fff"
      />
    </View>
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
      maxHeight: '94%',
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.border, marginBottom: S.md },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heading: { color: t.text, fontSize: 20, fontWeight: '800' },
    lockedNote: { color: t.cat.call, fontSize: 13, fontWeight: '700' },
    input: {
      backgroundColor: t.surface,
      borderRadius: R.md,
      borderWidth: 1,
      borderColor: t.border,
      color: t.text,
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: S.lg,
      paddingVertical: 14,
    },
    inputSmall: { fontSize: 15, paddingVertical: 11 },
    numInput: { width: 110 },
    notes: { minHeight: 96 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    unit: { color: t.textDim, fontSize: 14, fontWeight: '700' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    fieldLabel: { color: t.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    fieldHint: { color: t.textFaint, fontSize: 12, lineHeight: 16 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    toggleLabel: { color: t.text, fontSize: 15, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: S.sm, marginTop: S.md },
    btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: R.md },
    btnPrimary: { backgroundColor: t.accent },
    btnPrimaryText: { color: t.onAccent, fontSize: 16, fontWeight: '800' },
    btnGhost: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    btnGhostText: { color: t.text, fontSize: 16, fontWeight: '700' },
    btnDisabled: { opacity: 0.4 },
  });
