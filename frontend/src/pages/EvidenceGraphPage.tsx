import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, RotateCcw, X, Info } from 'lucide-react';
import { api } from '../api/client';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';

export const EvidenceGraphPage: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEvidenceGraph();
      // Style custom nodes according to type — pale tinted fills with dark
      // coloured borders so labels (ink #251C19) stay readable on the ivory canvas
      const formattedNodes = (data.nodes || []).map((node: any) => {
        let bg = '#FFFFFF';
        let border = '#D8CDB8';
        let labelColor = '#251C19';

        if (node.type === 'brandRuleNode') {
          border = '#C83232';
          bg = '#F9EAE7';
        } else if (node.type === 'approvedFactNode') {
          border = '#1F6E52';
          bg = '#E9F5EF';
        } else if (node.type === 'findingNode') {
          border = '#A8761A';
          bg = '#FAF2E0';
        } else if (node.type === 'claimDnaNode') {
          border = '#B83A60';
          bg = '#FAEEF2';
        } else if (node.type === 'decisionNode') {
          border = '#1F6E52';
          bg = '#E3F0EA';
        }

        return {
          ...node,
          style: {
            background: bg,
            color: labelColor,
            border: `2px solid ${border}`,
            borderRadius: '12px',
            padding: '12px',
            fontSize: '11px',
            width: 220,
            boxShadow: '0 1px 2px rgba(37, 28, 25, 0.05), 0 8px 24px -18px rgba(37, 28, 25, 0.25)',
          },
        };
      });

      setNodes(formattedNodes);
      setEdges(data.edges || []);
      setSummary(data.summary);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'The evidence graph could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNodeData(node.data);
  }, []);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="shrink-0">
        <PageHeader
          icon={<Network className="w-5 h-5" />}
          eyebrow="Interactive Provenance Flow"
          title="Brand Evidence Graph — The Source of Truth"
          description="Visual provenance tracing: Brand Rule → Approved Fact → Content Claim → Finding → Reviewer Decision"
          actions={
            <Button
              variant="secondary"
              onClick={loadGraph}
              loading={loading}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Refresh Graph
            </Button>
          }
        />
      </div>

      {error && <ErrorState message={error} onRetry={loadGraph} className="shrink-0" />}

      {/* Main Flow Canvas with Side Inspector */}
      <div className="flex-1 relative rounded-lg border border-line overflow-hidden bg-ivory shadow-card flex">
        {loading ? (
          <div className="flex-1 p-6 space-y-3">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<Network style={{ width: 18, height: 18 }} />}
              title="No evidence graph to display"
              description="Once a review has run in the Studio, the provenance chain between brand rules, facts, claims, findings and decisions will appear here."
              action={
                <Button size="sm" variant="secondary" onClick={loadGraph}>
                  Refresh Graph
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex-1 h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls className="bg-white border border-line text-ink fill-current" />
              <MiniMap
                nodeColor={(n: any) => n.style?.border?.split(' ')[2] || '#C83232'}
                maskColor="rgba(248, 244, 236, 0.75)"
                className="bg-white border border-line rounded-lg"
              />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#D8CDB8" />

              <Panel position="top-left" className="bg-white/95 border border-line p-3 rounded-md shadow-card text-xs space-y-1.5">
                <p className="font-bold text-ink uppercase text-[10px] tracking-wider">Graph Legend</p>
                <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#C83232' }}></span><span className="text-ink-soft">Brand Rule</span></div>
                <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#1F6E52' }}></span><span className="text-ink-soft">Approved Fact</span></div>
                <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#A8761A' }}></span><span className="text-ink-soft">Governance Finding</span></div>
                <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#B83A60' }}></span><span className="text-ink-soft">Claim DNA</span></div>
                <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#1F6E52' }}></span><span className="text-ink-soft">Reviewer Decision</span></div>
              </Panel>
            </ReactFlow>
          </div>
        )}

        {/* Slide-out Node Inspector */}
        {selectedNodeData && (
          <div className="w-80 bg-white border-l border-line p-5 shadow-lg flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-xs font-bold text-vermilion uppercase tracking-wider font-mono">
                  {selectedNodeData.type} Node Details
                </span>
                <button
                  onClick={() => setSelectedNodeData(null)}
                  aria-label="Close node inspector"
                  title="Close node inspector"
                  className="text-ink-muted hover:text-ink p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {Object.entries(selectedNodeData).map(([key, value]) => {
                  if (typeof value === 'object') return null;
                  return (
                    <div key={key} className="bg-ivory p-2.5 rounded-lg border border-line">
                      <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">{key.replace(/_/g, ' ')}</span>
                      <span className="text-ink font-medium break-words leading-relaxed">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-line text-[11px] text-ink-muted flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-vermilion shrink-0" />
              <span>Nodes reflect real live database relationships and active version references.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
