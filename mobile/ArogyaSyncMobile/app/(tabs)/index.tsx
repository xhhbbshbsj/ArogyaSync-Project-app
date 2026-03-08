import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Link } from 'expo-router';

interface HistoryItem {
  _id: string;
  diagnosis: string;
  timestamp: string;
  [key: string]: any;
}

const API_URL = "http://192.168.1.2:8000"; 

export default function MobileDashboard() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMobileHistory();
  }, []);

  const fetchMobileHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`);
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = (id: string) => {
    Alert.alert("Delete Record", "Are you sure you want to remove this scan from the app database?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await fetch(`${API_URL}/api/history/${id}`, { method: 'DELETE' });
          setHistory(history.filter(item => item._id !== id));
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Premium Header Card - Replacing old "Vaidya Voice" header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>arogya_app</Text>
        <Text style={styles.subHeader}>Diagnostic Hub • Field Data Sync</Text>
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientId}>Scan #{1000 + index}</Text>
                  <Text style={styles.diagnosis}>{item.diagnosis}</Text>
                  <Text style={styles.time}>{new Date(item.timestamp).toLocaleString()}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteRecord(item._id)} style={styles.deleteBtn}>
                  <Text style={styles.trashIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No field records found in arogya_app.</Text>
            }
          />
        )}
      </View>

      <Link href="/scan" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  headerCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 25,
    marginBottom: 20,
    marginTop: 10,
    elevation: 4,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1a73e8', 
    letterSpacing: -0.5 
  },
  subHeader: { 
    fontSize: 14, 
    color: '#5f6368', 
    fontWeight: '600',
    marginTop: 4 
  },
  listContainer: { flex: 1 },
  card: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  patientId: { fontWeight: 'bold', color: '#1a73e8', fontSize: 14, textTransform: 'uppercase' },
  diagnosis: { fontSize: 18, fontWeight: '700', color: '#3c4043', marginTop: 4 },
  time: { fontSize: 12, color: '#9aa0a6', marginTop: 4 },
  deleteBtn: { padding: 10, backgroundColor: '#feeef3', borderRadius: 12 },
  trashIcon: { fontSize: 20 },
  fab: { 
    position: 'absolute', 
    right: 25, 
    bottom: 25, 
    width: 65, 
    height: 65, 
    borderRadius: 32.5, 
    backgroundColor: '#1a73e8', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8 
  },
  fabText: { color: '#fff', fontSize: 35, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#5f6368', marginTop: 40, fontSize: 16 }
});