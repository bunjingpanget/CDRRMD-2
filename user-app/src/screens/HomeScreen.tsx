import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../services/api';
import { getWeatherVisualByCode } from '../utils/weatherVisual';

type AlertItem = { id: number; title: string; body: string; severity: string };
type AnnouncementItem = { id: number; title: string; body: string };
type WeatherResponse = { current?: { temperature_2m?: number; weather_code?: number } };

const FALLBACK =
  'https://api.open-meteo.com/v1/forecast?latitude=14.2117&longitude=121.1653&current=temperature_2m,weather_code&timezone=auto';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [news, setNews] = useState<AnnouncementItem[]>([]);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [a, n, w] = await Promise.allSettled([
      api.get('/content/alerts'),
      api.get('/content/announcements'),
      api.get('/weather?latitude=14.2117&longitude=121.1653'),
    ]);
    setAlerts(a.status === 'fulfilled' ? a.value.data ?? [] : []);
    setNews(n.status === 'fulfilled' ? n.value.data ?? [] : []);
    if (w.status === 'fulfilled') { setWeather(w.value.data ?? null); return; }
    try { const r = await fetch(FALLBACK); setWeather(await r.json()); } catch { setWeather(null); }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const visual = useMemo(
    () => getWeatherVisualByCode(weather?.current?.weather_code),
    [weather?.current?.weather_code],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  return (
    <View style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <View style={st.logoCircle}>
            <Image source={require('../../assets/cdrrmd-logo.png')} style={st.logoImage} />
          </View>
          <Text style={st.headerTitle}>CDRRMD</Text>
        </View>
        <View style={st.headerRight}>
          <TouchableOpacity style={st.headerIconBtn}>
            <MaterialCommunityIcons name="bell-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[st.headerIconBtn, { marginLeft: 10 }]}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={st.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Weather Card */}
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('Weather' as never)}>
          <ImageBackground
            source={{ uri: visual.backgroundUri }}
            resizeMode="cover"
            style={st.weatherCard}
            imageStyle={{ borderRadius: 14 }}
          >
            <View style={st.weatherOverlay}>
              <Text style={st.weatherLocation}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#fff" /> Calamba City
              </Text>
              <Text style={st.weatherCondition}>
                {visual.condition} • {weather?.current?.temperature_2m ?? '--'}°C (Calamba City)
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Request Rescue */}
        <TouchableOpacity
          style={st.rescueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Safe Zone' as never)}
        >
          <View style={st.rescueIconBox}>
            <MaterialCommunityIcons name="ambulance" size={28} color="#444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.rescueTitle}>Request Rescue</Text>
            <Text style={st.rescueSub}>Tap to view Calamba rescue map and location bounds</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Report Row */}
        <View style={st.reportRow}>
          <TouchableOpacity
            style={[st.reportCard, { backgroundColor: '#c0392b' }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Report Fire' as never)}
          >
            <View style={st.reportIconCircle}>
              <MaterialCommunityIcons name="fire" size={28} color="#fff" />
            </View>
            <Text style={st.reportLabel}>Report Fire</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.reportCard, { backgroundColor: '#2980b9' }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Report Flood' as never)}
          >
            <View style={st.reportIconCircle}>
              <MaterialCommunityIcons name="home-flood" size={26} color="#fff" />
            </View>
            <Text style={st.reportLabel}>Report Flood</Text>
          </TouchableOpacity>
        </View>

        {/* Latest Alerts */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Latest Alerts</Text>
        </View>
        {alerts.length === 0 ? (
          <View style={st.card}><Text style={st.cardMuted}>No alerts yet.</Text></View>
        ) : (
          alerts.slice(0, 3).map((item) => (
            <View key={item.id} style={st.card}>
              <Text style={st.cardTitle}>{item.title}</Text>
              <Text style={st.cardBody}>{item.body}</Text>
              <Text style={st.cardMuted}>Severity: {item.severity}</Text>
            </View>
          ))
        )}

        {/* News & Announcement */}
        <View style={[st.sectionHeader, { marginTop: 4 }]}>
          <Text style={st.sectionTitle}>News & Announcement</Text>
        </View>
        {news.length === 0 ? (
          <View style={st.card}><Text style={st.cardMuted}>No announcements yet.</Text></View>
        ) : (
          news.slice(0, 3).map((item) => (
            <View key={item.id} style={st.card}>
              <Text style={st.cardTitle}>{item.title}</Text>
              <Text style={st.cardBody}>{item.body}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8e8ec' },
  header: {
    backgroundColor: '#0d3558',
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    overflow: 'hidden',
  },
  logoImage: { width: 24, height: 24, borderRadius: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { padding: 14, paddingBottom: 30 },

  weatherCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  weatherOverlay: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingVertical: 18, paddingHorizontal: 16, borderRadius: 14,
  },
  weatherLocation: { color: '#fff', fontSize: 15, fontWeight: '700' },
  weatherCondition: { color: '#fff', fontSize: 14, marginTop: 2 },

  rescueBtn: {
    backgroundColor: '#e67e22', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  rescueIconBox: {
    width: 50, height: 50, borderRadius: 12, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rescueTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  rescueSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2, lineHeight: 16 },

  reportRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  reportCard: {
    width: '48%' as any, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  reportIconCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  reportLabel: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 6 },

  sectionHeader: {
    backgroundColor: '#d8d8db', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10,
  },
  sectionTitle: { color: '#0d3558', fontSize: 20, fontWeight: '800' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTitle: { color: '#0d3558', fontSize: 15, fontWeight: '700' },
  cardBody: { color: '#475569', fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardMuted: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
});
