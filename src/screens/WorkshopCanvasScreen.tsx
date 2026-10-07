import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';
import { canvasService, CanvasLayout } from '../services/canvasService';
import { printerService } from '../services/printerService';
import { PrinterSummary } from '../types/printer';
import ErrorState from '../components/ui/ErrorState';
import ScreenHeader from '../components/ui/ScreenHeader';
import Svg, { Circle, Line } from 'react-native-svg';

export default function WorkshopCanvasScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [printers, setPrinters] = useState<PrinterSummary[]>([]);
  const [layout, setLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedPrinters, fetchedLayout] = await Promise.all([
        printerService.getAll(),
        canvasService.getCanvasLayout(),
      ]);
      setPrinters(fetchedPrinters);
      setLayout(fetchedLayout);
    } catch (e: any) {
      setError(e.message || 'Error al cargar el taller');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Taller" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Taller" />
        <ErrorState error={error} onRetry={load} />
      </View>
    );
  }

  // Temporary static UI for nodes
  return (
    <View style={styles.container}>
      <ScreenHeader title="Taller" />
      <View style={styles.canvasArea}>
        <Text style={styles.debugText}>
          {printers.length} impresoras encontradas. 
          {layout.nodes.length} ubicadas en el plano.
        </Text>
        
        <View style={styles.canvasBorder}>
            {layout.nodes.map(node => {
              const p = printers.find(x => x.id === node.printerId);
              if (!p) return null;
              return (
                <View 
                  key={node.printerId} 
                  style={[styles.node, { left: `${node.x * 100}%`, top: `${node.y * 100}%` }]}
                >
                  <Text style={styles.nodeText}>{p.brand} {p.model}</Text>
                  <Text style={styles.statusText}>{p.status}</Text>
                </View>
              );
            })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvasArea: { flex: 1, padding: Spacing.md },
  debugText: { ...Typography.caption, color: Colors.textTertiary, marginBottom: Spacing.md },
  canvasBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    position: 'relative',
    overflow: 'hidden'
  },
  node: {
    position: 'absolute',
    width: 100,
    height: 60,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -50,
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeText: { ...Typography.caption, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  statusText: { ...Typography.footnote, color: Colors.textSecondary },
});
