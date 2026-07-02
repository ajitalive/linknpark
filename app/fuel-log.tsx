import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Share, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';

const FUEL_KEY = 'fuel_log_v1';
const COST_KEY = 'fuel_costs_v1';

type Entry = {
  id: string;
  odometer: number;   // km
  litres: number;
  cost: number;       // ₹ total
  isFull: boolean;
  note: string;
  date: number;
  lat?: number;
  lng?: number;
  place?: string;
  fuelType?: string;
};

// India-relevant fuel types — the point is to expose the E20 mileage drop
const FUEL_TYPES = ['Petrol (E10)', 'E20', 'Premium', 'Diesel', 'CNG', 'Other'];

type CostCat = 'service' | 'insurance' | 'tolls' | 'parking' | 'repair' | 'other';
type Cost = { id: string; cat: CostCat; amount: number; note: string; date: number };

const CATS: { id: CostCat; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'service', label: 'Service', icon: 'construct', color: Colors.primary },
  { id: 'insurance', label: 'Insurance', icon: 'shield-checkmark', color: '#3B82F6' },
  { id: 'tolls', label: 'Tolls', icon: 'card', color: Colors.amber },
  { id: 'parking', label: 'Parking', icon: 'car', color: '#8B5CF6' },
  { id: 'repair', label: 'Repair', icon: 'hammer', color: Colors.critical },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: Colors.textSecondary },
];
const catOf = (id: CostCat) => CATS.find(c => c.id === id)!;

// ── persistence (same web/native split used across the app) ──
async function save(key: string, data: any) {
  const val = JSON.stringify(data);
  if (Platform.OS === 'web') localStorage.setItem(key, val);
  else await SecureStore.setItemAsync(key, val);
}
async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// ── correct full-to-full mileage, handling partial fills ──
type Computed = Entry & { mileage: number | null; segDist?: number; segLitres?: number };
function computeMileages(entries: Entry[]): Computed[] {
  const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
  let lastFull: Entry | null = null;
  let pendingLitres = 0;
  const out: Computed[] = sorted.map(e => ({ ...e, mileage: null }));
  for (const e of out) {
    pendingLitres += e.litres;
    if (e.isFull) {
      if (lastFull) {
        const dist = e.odometer - lastFull.odometer;
        if (dist > 0 && pendingLitres > 0) {
          e.mileage = dist / pendingLitres;
          e.segDist = dist;
          e.segLitres = pendingLitres;
        }
      }
      lastFull = e;
      pendingLitres = 0;
    }
  }
  return out;
}

function monthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FuelLogScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'fuel' | 'costs'>('fuel');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // fuel form
  const [odo, setOdo] = useState('');
  const [litres, setLitres] = useState('');
  const [priceL, setPriceL] = useState('');
  const [cost, setCost] = useState('');
  const [isFull, setIsFull] = useState(true);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number; place?: string } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [fuelType, setFuelType] = useState(FUEL_TYPES[0]);

  // cost form
  const [costCat, setCostCat] = useState<CostCat>('service');
  const [costAmt, setCostAmt] = useState('');
  const [costNote, setCostNote] = useState('');

  useEffect(() => {
    Promise.all([load<Entry[]>(FUEL_KEY, []), load<Cost[]>(COST_KEY, [])])
      .then(([e, c]) => { setEntries(e); setCosts(c); setLoaded(true); });
  }, []);

  const computed = useMemo(() => computeMileages(entries), [entries]);
  const recentFuel = useMemo(() => [...computed].sort((a, b) => b.odometer - a.odometer), [computed]);
  const recentCosts = useMemo(() => [...costs].sort((a, b) => b.date - a.date), [costs]);

  const stats = useMemo(() => {
    const withM = computed.filter(c => c.mileage != null);
    const totalDist = withM.reduce((s, c) => s + (c.segDist || 0), 0);
    const totalSegLitres = withM.reduce((s, c) => s + (c.segLitres || 0), 0);
    const avgMileage = totalSegLitres > 0 ? totalDist / totalSegLitres : null;
    const mileages = withM.map(c => c.mileage!) as number[];
    const best = mileages.length ? Math.max(...mileages) : null;
    const worst = mileages.length ? Math.min(...mileages) : null;

    const fuelSpend = entries.reduce((s, e) => s + e.cost, 0);
    const costSpend = costs.reduce((s, c) => s + c.amount, 0);
    const totalSpend = fuelSpend + costSpend;

    const tm = monthKey(Date.now());
    const monthSpend =
      entries.filter(e => monthKey(e.date) === tm).reduce((s, e) => s + e.cost, 0) +
      costs.filter(c => monthKey(c.date) === tm).reduce((s, c) => s + c.amount, 0);

    // mileage grouped by fuel type — attribute each full-to-full segment to the
    // closing fill's fuel type. This is what surfaces the E20 mileage drop.
    const typeAgg: Record<string, { dist: number; litres: number; n: number }> = {};
    for (const c of withM) {
      const t = c.fuelType || 'Petrol (E10)';
      if (!typeAgg[t]) typeAgg[t] = { dist: 0, litres: 0, n: 0 };
      typeAgg[t].dist += c.segDist || 0;
      typeAgg[t].litres += c.segLitres || 0;
      typeAgg[t].n += 1;
    }
    const byType = Object.entries(typeAgg)
      .map(([type, v]) => ({ type, avg: v.litres > 0 ? v.dist / v.litres : 0, n: v.n }))
      .filter(t => t.avg > 0)
      .sort((a, b) => b.avg - a.avg);

    return { avgMileage, best, worst, fuelSpend, costSpend, totalSpend, monthSpend, fuelCount: entries.length, byType };
  }, [computed, entries, costs]);

  function resetFuel() { setOdo(''); setLitres(''); setPriceL(''); setCost(''); setIsFull(true); setNote(''); setErr(''); setLoc(null); setLocBusy(false); setFuelType(FUEL_TYPES[0]); }

  async function captureLocation() {
    setLocBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErr('Location permission denied — you can still save without it.');
        setLocBusy(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let place: string | undefined;
      try {
        const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (g) place = [g.name, g.street, g.city].filter(Boolean).slice(0, 2).join(', ');
      } catch { /* reverse geocode is best-effort */ }
      setLoc({ lat, lng, place });
      setErr('');
    } catch {
      setErr('Could not get location — save without it, or try again.');
    }
    setLocBusy(false);
  }
  function resetCost() { setCostCat('service'); setCostAmt(''); setCostNote(''); setErr(''); }

  // price/L → auto-fill total when total is empty
  function onLitres(v: string) { setLitres(v); autoCost(v, priceL); }
  function onPriceL(v: string) { setPriceL(v); autoCost(litres, v); }
  function autoCost(l: string, p: string) {
    const lf = parseFloat(l), pf = parseFloat(p);
    if (lf > 0 && pf > 0) setCost((lf * pf).toFixed(2));
  }

  async function addFuel() {
    const odometer = parseFloat(odo);
    const l = parseFloat(litres);
    const c = parseFloat(cost) || 0;
    if (!odometer || odometer <= 0) { setErr('Enter the odometer reading (km).'); return; }
    if (!l || l <= 0) { setErr('Enter how much fuel you added (litres).'); return; }
    const maxOdo = entries.reduce((m, e) => Math.max(m, e.odometer), 0);
    if (entries.length > 0 && odometer <= maxOdo) { setErr(`Odometer must be higher than your last reading (${maxOdo} km).`); return; }

    const next = [...entries, { id: String(Date.now()), odometer, litres: l, cost: c, isFull, note: note.trim(), date: Date.now(), lat: loc?.lat, lng: loc?.lng, place: loc?.place, fuelType }];
    setEntries(next); await save(FUEL_KEY, next);
    resetFuel(); setShowForm(false);
  }

  async function addCost() {
    const amount = parseFloat(costAmt);
    if (!amount || amount <= 0) { setErr('Enter an amount (₹).'); return; }
    const next = [...costs, { id: String(Date.now()), cat: costCat, amount, note: costNote.trim(), date: Date.now() }];
    setCosts(next); await save(COST_KEY, next);
    resetCost(); setShowForm(false);
  }

  function confirmDelete(msg: string, fn: () => void) {
    if (Platform.OS === 'web') { if (typeof window !== 'undefined' && window.confirm(msg)) fn(); return; }
    Alert.alert('Delete?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: fn }]);
  }
  function removeFuel(id: string) {
    confirmDelete('Delete this fill-up?', async () => { const n = entries.filter(e => e.id !== id); setEntries(n); await save(FUEL_KEY, n); });
  }
  function removeCost(id: string) {
    confirmDelete('Delete this expense?', async () => { const n = costs.filter(c => c.id !== id); setCosts(n); await save(COST_KEY, n); });
  }

  async function exportCsv() {
    const fuelRows = [
      'FUEL',
      'Date,Odometer (km),Litres,Cost (INR),Fuel Type,Tank,Mileage (km/l),Location,Note',
      ...computed.sort((a, b) => a.odometer - b.odometer).map(c =>
        [fmtDate(c.date), c.odometer, c.litres, c.cost, `"${c.fuelType || ''}"`, c.isFull ? 'Full' : 'Partial',
         c.mileage != null ? c.mileage.toFixed(2) : '',
         c.lat != null ? `"https://maps.google.com/?q=${c.lat},${c.lng}"` : '',
         `"${c.note.replace(/"/g, '""')}"`].join(',')),
    ];
    const costRows = [
      '', 'COSTS',
      'Date,Category,Amount (INR),Note',
      ...recentCosts.slice().reverse().map(c =>
        [fmtDate(c.date), catOf(c.cat).label, c.amount, `"${c.note.replace(/"/g, '""')}"`].join(',')),
    ];
    const csv = [...fuelRows, ...costRows].join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'fuel-log.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: csv, title: 'fuel-log.csv' });
    }
  }

  const hasData = stats.fuelCount > 0 || costs.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}><Ionicons name="speedometer" size={28} color={Colors.primary} /></View>
          <Text style={styles.headerTitle}>Fuel &amp; Costs</Text>
          <Text style={styles.headerSub}>Mileage, fuel and running costs in one place</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!loaded ? null : (
          <>
            {/* Summary */}
            {hasData && (
              <Card>
                <View style={styles.statsRow}>
                  <Stat value={stats.avgMileage != null ? stats.avgMileage.toFixed(1) : '—'} unit="km/l" label="Avg mileage" />
                  <View style={styles.statDivider} />
                  <Stat value={`₹${Math.round(stats.totalSpend).toLocaleString('en-IN')}`} unit="" label="Total spent" />
                  <View style={styles.statDivider} />
                  <Stat value={`₹${Math.round(stats.monthSpend).toLocaleString('en-IN')}`} unit="" label="This month" />
                </View>
                {stats.best != null && (
                  <View style={styles.subStats}>
                    <Text style={styles.subStat}>Best {stats.best.toFixed(1)} · Worst {stats.worst!.toFixed(1)} km/l</Text>
                    <Text style={styles.subStat}>Fuel ₹{Math.round(stats.fuelSpend).toLocaleString('en-IN')} · Other ₹{Math.round(stats.costSpend).toLocaleString('en-IN')}</Text>
                  </View>
                )}
              </Card>
            )}

            {/* Mileage by fuel type — the E20 reality check */}
            {stats.byType.length >= 2 && (
              <Card>
                <Text style={styles.compareTitle}>Mileage by fuel type</Text>
                {(() => {
                  const top = stats.byType[0].avg;
                  return stats.byType.map(t => {
                    const dropPct = top > 0 ? ((top - t.avg) / top) * 100 : 0;
                    return (
                      <View key={t.type} style={styles.compareRow}>
                        <Text style={styles.compareType} numberOfLines={1}>{t.type}</Text>
                        <View style={styles.compareBarTrack}>
                          <View style={[styles.compareBarFill, { width: `${(t.avg / top) * 100}%` }]} />
                        </View>
                        <Text style={styles.compareVal}>{t.avg.toFixed(1)}</Text>
                        <Text style={[styles.compareDrop, dropPct >= 0.5 ? { color: Colors.critical } : { color: Colors.textMuted }]}>
                          {dropPct >= 0.5 ? `−${dropPct.toFixed(0)}%` : 'best'}
                        </Text>
                      </View>
                    );
                  });
                })()}
                <Text style={styles.compareHint}>km/l, full-tank segments. Lower bars = worse mileage on that fuel.</Text>
              </Card>
            )}

            {/* Tabs */}
            <View style={styles.tabs}>
              {(['fuel', 'costs'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]}
                  onPress={() => { setTab(t); setShowForm(false); setErr(''); }}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'fuel' ? 'Fuel' : 'Costs'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── FUEL TAB ── */}
            {tab === 'fuel' && (showForm ? (
              <Card>
                <Text style={styles.formTitle}>New fill-up</Text>
                <Field label="Odometer (km)" required>
                  <TextInput style={styles.input} value={odo} onChangeText={setOdo} placeholder="e.g. 45230" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </Field>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}><Field label="Litres" required>
                    <TextInput style={styles.input} value={litres} onChangeText={onLitres} placeholder="32.5" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                  </Field></View>
                  <View style={{ flex: 1 }}><Field label="Price / litre (₹)">
                    <TextInput style={styles.input} value={priceL} onChangeText={onPriceL} placeholder="optional" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                  </Field></View>
                </View>
                <Field label="Total cost (₹)">
                  <TextInput style={styles.input} value={cost} onChangeText={setCost} placeholder="auto-filled from price × litres" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </Field>
                <Text style={styles.fieldLabel}>Fuel type</Text>
                <View style={styles.catGrid}>
                  {FUEL_TYPES.map(ft => (
                    <TouchableOpacity key={ft} style={[styles.catChip, fuelType === ft && { borderColor: Colors.primary, backgroundColor: Colors.primaryBg }]} onPress={() => setFuelType(ft)}>
                      <Text style={[styles.catText, fuelType === ft && { color: Colors.primary }]}>{ft}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.toggle} onPress={() => setIsFull(v => !v)} activeOpacity={0.7}>
                  <Ionicons name={isFull ? 'checkbox' : 'square-outline'} size={22} color={isFull ? Colors.primary : Colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Filled the tank full</Text>
                    <Text style={styles.toggleSub}>Uncheck for a partial fill — mileage stays accurate</Text>
                  </View>
                </TouchableOpacity>
                <Field label="Note">
                  <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="optional — station, fuel type…" placeholderTextColor={Colors.textMuted} />
                </Field>

                {loc ? (
                  <View style={styles.locSaved}>
                    <Ionicons name="location" size={18} color={Colors.primary} />
                    <Text style={styles.locSavedText} numberOfLines={1}>{loc.place || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</Text>
                    <TouchableOpacity onPress={() => setLoc(null)} hitSlop={8}><Ionicons name="close-circle" size={18} color={Colors.textMuted} /></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.locBtn} onPress={captureLocation} disabled={locBusy} activeOpacity={0.7}>
                    <Ionicons name={locBusy ? 'sync' : 'location-outline'} size={18} color={Colors.primary} />
                    <Text style={styles.locBtnText}>{locBusy ? 'Getting location…' : 'Tag fuel station location'}</Text>
                  </TouchableOpacity>
                )}

                {!!err && <Text style={styles.err}>{err}</Text>}
                <View style={styles.formBtns}>
                  <View style={{ flex: 1 }}><Button label="Cancel" variant="secondary" onPress={() => { resetFuel(); setShowForm(false); }} /></View>
                  <View style={{ flex: 1 }}><Button label="Save" onPress={addFuel} /></View>
                </View>
              </Card>
            ) : (
              <Button label="Add fill-up" size="lg" onPress={() => { resetFuel(); setShowForm(true); }} icon={<Ionicons name="add-circle" size={18} color="#fff" />} />
            ))}

            {tab === 'fuel' && recentFuel.length > 0 && (
              <>
                <ListHeader title="Fill-ups" onExport={exportCsv} />
                {recentFuel.map(c => (
                  <Card key={c.id} style={styles.entryCard}>
                    <View style={styles.entryTop}>
                      <Text style={styles.entryOdo}>{c.odometer.toLocaleString('en-IN')} km</Text>
                      {c.mileage != null ? (
                        <View style={styles.mileageBadge}><Text style={styles.mileageText}>{c.mileage.toFixed(1)} km/l</Text></View>
                      ) : (
                        <View style={[styles.mileageBadge, styles.mileageMuted]}><Text style={[styles.mileageText, { color: Colors.textMuted }]}>{c.isFull ? 'baseline' : 'partial'}</Text></View>
                      )}
                    </View>
                    <View style={styles.entryMeta}>
                      <Text style={styles.entryMetaText}>{c.litres} L{c.cost ? ` · ₹${c.cost}` : ''}{c.fuelType ? ` · ${c.fuelType}` : ''} · {fmtDate(c.date)}</Text>
                      <TouchableOpacity onPress={() => removeFuel(c.id)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={Colors.textMuted} /></TouchableOpacity>
                    </View>
                    {!!c.note && <Text style={styles.entryNote}>{c.note}</Text>}
                    {c.lat != null && c.lng != null && (
                      <TouchableOpacity style={styles.locChip} onPress={() => Linking.openURL(`https://maps.google.com/?q=${c.lat},${c.lng}`)}>
                        <Ionicons name="location" size={13} color={Colors.primary} />
                        <Text style={styles.locChipText} numberOfLines={1}>{c.place || 'View on map'}</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                ))}
              </>
            )}

            {/* ── COSTS TAB ── */}
            {tab === 'costs' && (showForm ? (
              <Card>
                <Text style={styles.formTitle}>New expense</Text>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.catGrid}>
                  {CATS.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.catChip, costCat === c.id && { borderColor: c.color, backgroundColor: `${c.color}18` }]} onPress={() => setCostCat(c.id)}>
                      <Ionicons name={c.icon} size={16} color={costCat === c.id ? c.color : Colors.textMuted} />
                      <Text style={[styles.catText, costCat === c.id && { color: c.color }]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Field label="Amount (₹)" required>
                  <TextInput style={styles.input} value={costAmt} onChangeText={setCostAmt} placeholder="e.g. 3500" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </Field>
                <Field label="Note">
                  <TextInput style={styles.input} value={costNote} onChangeText={setCostNote} placeholder="optional — what was it for…" placeholderTextColor={Colors.textMuted} />
                </Field>
                {!!err && <Text style={styles.err}>{err}</Text>}
                <View style={styles.formBtns}>
                  <View style={{ flex: 1 }}><Button label="Cancel" variant="secondary" onPress={() => { resetCost(); setShowForm(false); }} /></View>
                  <View style={{ flex: 1 }}><Button label="Save" onPress={addCost} /></View>
                </View>
              </Card>
            ) : (
              <Button label="Add expense" size="lg" onPress={() => { resetCost(); setShowForm(true); }} icon={<Ionicons name="add-circle" size={18} color="#fff" />} />
            ))}

            {tab === 'costs' && recentCosts.length > 0 && (
              <>
                <ListHeader title="Expenses" onExport={exportCsv} />
                {recentCosts.map(c => {
                  const cat = catOf(c.cat);
                  return (
                    <Card key={c.id} style={styles.entryCard}>
                      <View style={styles.entryTop}>
                        <View style={styles.costLeft}>
                          <View style={[styles.costIcon, { backgroundColor: `${cat.color}18` }]}><Ionicons name={cat.icon} size={16} color={cat.color} /></View>
                          <Text style={styles.entryOdo}>{cat.label}</Text>
                        </View>
                        <Text style={styles.costAmt}>₹{c.amount.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={styles.entryMeta}>
                        <Text style={styles.entryMetaText}>{fmtDate(c.date)}</Text>
                        <TouchableOpacity onPress={() => removeCost(c.id)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={Colors.textMuted} /></TouchableOpacity>
                      </View>
                      {!!c.note && <Text style={styles.entryNote}>{c.note}</Text>}
                    </Card>
                  );
                })}
              </>
            )}

            {/* Empty states */}
            {tab === 'fuel' && recentFuel.length === 0 && !showForm && (
              <Empty icon="speedometer-outline" title="No fill-ups yet" sub="Log your next fuel stop — just odometer and litres. We do the math." />
            )}
            {tab === 'costs' && recentCosts.length === 0 && !showForm && (
              <Empty icon="receipt-outline" title="No expenses yet" sub="Track service, insurance, tolls and repairs to see your true cost of running the car." />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}<Text style={styles.statUnit}>{unit ? ` ${unit}` : ''}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: Colors.primary }}> *</Text> : ''}</Text>
      {children}
    </View>
  );
}
function ListHeader({ title, onExport }: { title: string; onExport: () => void }) {
  return (
    <View style={styles.listHeader}>
      <Text style={styles.listTitle}>{title}</Text>
      <TouchableOpacity style={styles.exportBtn} onPress={onExport}>
        <Ionicons name="download-outline" size={16} color={Colors.primary} />
        <Text style={styles.exportText}>Export CSV</Text>
      </TouchableOpacity>
    </View>
  );
}
function Empty({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, backgroundColor: Colors.bg },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.divider },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.divider },
  statValue: { fontSize: 19, fontWeight: '900', color: Colors.text },
  statUnit: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  subStats: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider, gap: 4 },
  subStat: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  compareTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  compareType: { width: 80, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  compareBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceSecondary, overflow: 'hidden' },
  compareBarFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  compareVal: { width: 34, fontSize: 13, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  compareDrop: { width: 40, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  compareHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  tabs: { flexDirection: 'row', backgroundColor: Colors.surfaceSecondary, borderRadius: 12, padding: 4, marginTop: 16, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.bg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: Colors.text },

  formTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.divider, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 15, backgroundColor: Colors.surfaceSecondary },
  row2: { flexDirection: 'row', gap: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 4 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  toggleSub: { fontSize: 12, color: Colors.textMuted },
  err: { fontSize: 13, color: Colors.critical, fontWeight: '600', marginBottom: 10 },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },

  locBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.divider, backgroundColor: Colors.surfaceSecondary, marginBottom: 12 },
  locBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  locSaved: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.primaryBg, marginBottom: 12 },
  locSavedText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  locChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  locChipText: { fontSize: 12, fontWeight: '700', color: Colors.primary, maxWidth: 240 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.divider, backgroundColor: Colors.surfaceSecondary },
  catText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  listTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exportText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  entryCard: { marginBottom: 10 },
  entryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryOdo: { fontSize: 17, fontWeight: '800', color: Colors.text },
  mileageBadge: { backgroundColor: Colors.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  mileageMuted: { backgroundColor: Colors.surfaceSecondary },
  mileageText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  entryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  entryMetaText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  entryNote: { fontSize: 13, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },

  costLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  costIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  costAmt: { fontSize: 17, fontWeight: '800', color: Colors.text },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
