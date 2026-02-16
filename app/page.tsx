'use client'

import { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FiEdit3,
  FiVideo,
  FiClock,
  FiZap,
  FiTarget,
  FiAlignLeft,
  FiArrowRight,
  FiFileText,
  FiFilm,
  FiCopy,
  FiCheck,
  FiArrowLeft,
  FiInbox,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiLoader,
  FiRefreshCw,
} from 'react-icons/fi'

// ─── Agent IDs ─────────────────────────────────────────────────────────────────
const SCRIPT_AGENT_ID = '699357fe777b6c1c03678e87'
const HEYGEN_AGENT_ID = '699357e6b175ad1ab1aed1ef'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ScriptData {
  hook: string
  body: string
  cta: string
  title: string
  estimated_duration: string
  visual_notes: string
}

interface PromptData {
  overall_direction: string
  scenes: string
  full_heygen_prompt: string
  total_duration: string
  scene_count: string
}

interface HistoryItem {
  id: string
  contentIdea: string
  contentType: string
  notes: string
  scriptData: ScriptData | null
  promptData: PromptData | null
  status: 'draft' | 'approved' | 'prompt_generated'
  createdAt: string
}

// ─── Sample Data ───────────────────────────────────────────────────────────────
const SAMPLE_SCRIPT: ScriptData = {
  title: 'Build an AI App in 60 Seconds',
  hook: 'Wait -- you can build a FULL AI app without writing a single line of code? Let me show you how I did it in under a minute.',
  body: 'So I found this tool called Prompt Architect, and honestly, it blew my mind. I literally typed in what I wanted -- a customer support chatbot -- hit generate, and boom. It gave me a working app with a clean UI, connected to an AI agent, ready to deploy. No backend setup, no API headaches, no config files. Just describe your idea and it builds the whole thing. The AI handles the logic, the routing, everything. I even customized the look in like 10 seconds.',
  cta: 'Link is in my bio. Go try Prompt Architect right now -- you will thank me later. Drop a comment if you build something cool!',
  estimated_duration: '45-55 seconds',
  visual_notes: 'Start with a surprised face close-up. Screen record the Prompt Architect flow. Use quick cuts between typing and the generated app. End with pointing gesture toward bio link.',
}

const SAMPLE_PROMPT: PromptData = {
  overall_direction: 'Fast-paced, energetic UGC-style video. Bright, modern color palette with orange and white tones. Avatar should feel approachable and excited. Mix of talking-head A-roll with screen recordings as B-roll.',
  scenes: 'Scene 1 (0-3s): Hook -- Avatar close-up, surprised expression, text overlay "Build an AI App in 60s?"\nScene 2 (3-15s): Show screen recording of Prompt Architect landing page, avatar voiceover describing the discovery\nScene 3 (15-35s): Split screen -- avatar on left, screen recording on right showing the build process step by step\nScene 4 (35-45s): Quick montage of the finished app, zoom into UI details\nScene 5 (45-55s): Avatar back on screen, pointing gesture, CTA text overlay with link',
  full_heygen_prompt: 'Create a 55-second UGC-style video with an enthusiastic tech creator avatar. The video follows a "discovery" narrative arc.\n\nVisual Style: Bright, warm lighting. Modern minimalist background. Text overlays in bold sans-serif font.\n\nScene 1 (Hook, 0-3s): Close-up of avatar with surprised expression. Bold text overlay: "Build an AI App in 60s?" Motion: slight zoom in.\n\nScene 2 (Discovery, 3-15s): Avatar speaks with excitement while B-roll shows Prompt Architect website. Screen recording: landing page, feature highlights.\n\nScene 3 (Demo, 15-35s): Split-screen layout. Left: avatar narrating. Right: screen recording of typing a prompt and watching the app generate. Key moments: typing the idea, hitting generate, seeing the result.\n\nScene 4 (Result, 35-45s): Full-screen montage of the generated app UI. Quick cuts showing different screens. Subtle zoom effects on key features.\n\nScene 5 (CTA, 45-55s): Back to avatar, pointing down/right. Text overlay: "Link in bio" with arrow animation. Warm smile, direct eye contact.\n\nAudio: Upbeat background music at 20% volume. Clear voice narration throughout.',
  total_duration: '55 seconds',
  scene_count: '5',
}

const SAMPLE_HISTORY: HistoryItem[] = [
  {
    id: 'sample-1',
    contentIdea: 'How to build an AI-powered customer support chatbot without coding',
    contentType: 'How-To',
    notes: 'Target audience: non-technical founders',
    scriptData: SAMPLE_SCRIPT,
    promptData: SAMPLE_PROMPT,
    status: 'prompt_generated',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sample-2',
    contentIdea: 'Case study: How a SaaS startup automated 80% of their support tickets',
    contentType: 'Case Study',
    notes: '',
    scriptData: {
      title: 'From Drowning in Tickets to 80% Automation',
      hook: 'This startup was losing $50K a month on support tickets. Here is how they fixed it overnight.',
      body: 'They were a 10-person SaaS company getting 500+ tickets a day. Their support team was burned out. Then they tried Prompt Architect to build an AI agent that handles tier-1 support automatically...',
      cta: 'Want the same results? Check the link in bio for Prompt Architect.',
      estimated_duration: '40-50 seconds',
      visual_notes: 'Use dramatic before/after visuals. Show ticket dashboard numbers going down.',
    },
    promptData: null,
    status: 'approved',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
]

// ─── Markdown Renderer ─────────────────────────────────────────────────────────
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ─── Glass Card Wrapper ─────────────────────────────────────────────────────────
function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[0.875rem] border border-white/[0.18] bg-card/75 backdrop-blur-[16px] shadow-md',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── Script Skeleton ────────────────────────────────────────────────────────────
function ScriptSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/4" />
      <div className="space-y-4">
        <div>
          <Skeleton className="h-5 w-20 mb-2" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div>
          <Skeleton className="h-5 w-16 mb-2" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div>
          <Skeleton className="h-5 w-14 mb-2" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

// ─── Prompt Skeleton ────────────────────────────────────────────────────────────
function PromptSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-8 w-28 rounded-[0.875rem]" />
      </div>
      <div>
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div>
        <Skeleton className="h-5 w-36 mb-2" />
        <Skeleton className="h-40 w-full" />
      </div>
      <div>
        <Skeleton className="h-5 w-44 mb-2" />
        <Skeleton className="h-60 w-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

// ─── Content Type Chips ─────────────────────────────────────────────────────────
const CONTENT_TYPES = ['Case Study', 'Educational', 'How-To', 'Use Case', 'General']

function ContentTypeChips({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (type: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CONTENT_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            selected === type
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          {type}
        </button>
      ))}
    </div>
  )
}

// ─── Script Section ─────────────────────────────────────────────────────────────
function ScriptSection({
  icon,
  label,
  value,
  onChange,
  readOnly,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange?: (val: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm tracking-tight">
        {icon}
        <span>{label}</span>
      </div>
      {readOnly ? (
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {renderMarkdown(value)}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          rows={label === 'BODY' ? 6 : 3}
          className="w-full rounded-[0.875rem] border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
        />
      )}
    </div>
  )
}

// ─── Agent Info Panel ───────────────────────────────────────────────────────────
function AgentInfoPanel({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    {
      id: SCRIPT_AGENT_ID,
      name: 'UGC Script Generator',
      purpose: 'Generates viral UGC scripts with hooks, body, and CTAs',
    },
    {
      id: HEYGEN_AGENT_ID,
      name: 'HeyGen Prompt Generator',
      purpose: 'Converts approved scripts into HeyGen video prompts',
    },
  ]

  return (
    <GlassCard className="p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Powering Agents
      </p>
      <div className="space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2.5">
            <div
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0 transition-colors',
                activeAgentId === agent.id
                  ? 'bg-primary animate-pulse'
                  : 'bg-muted-foreground/30'
              )}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {agent.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {agent.purpose}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ─── Tab Navigation ─────────────────────────────────────────────────────────────
function TabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: 'studio' | 'prompt' | 'history') => void
}) {
  const tabs = [
    { id: 'studio' as const, label: 'Script Studio', icon: <FiEdit3 size={16} /> },
    { id: 'prompt' as const, label: 'Prompt Output', icon: <FiVideo size={16} /> },
    { id: 'history' as const, label: 'History', icon: <FiClock size={16} /> },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-[0.875rem] bg-secondary/60 backdrop-blur-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[0.625rem] text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Studio Tab ─────────────────────────────────────────────────────────────────
function StudioTab({
  contentIdea,
  setContentIdea,
  contentType,
  setContentType,
  notes,
  setNotes,
  isGenerating,
  onGenerate,
  scriptData,
  editableHook,
  setEditableHook,
  editableBody,
  setEditableBody,
  editableCta,
  setEditableCta,
  scriptStatus,
  onApprove,
  errorMessage,
}: {
  contentIdea: string
  setContentIdea: (v: string) => void
  contentType: string
  setContentType: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  isGenerating: boolean
  onGenerate: () => void
  scriptData: ScriptData | null
  editableHook: string
  setEditableHook: (v: string) => void
  editableBody: string
  setEditableBody: (v: string) => void
  editableCta: string
  setEditableCta: (v: string) => void
  scriptStatus: 'draft' | 'approved'
  onApprove: () => void
  errorMessage: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel - Input */}
      <div className="lg:col-span-1">
        <GlassCard className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 tracking-tight">
              Content Idea
            </label>
            <textarea
              value={contentIdea}
              onChange={(e) => setContentIdea(e.target.value)}
              placeholder="Describe your content idea for Prompt Architect..."
              rows={4}
              className="w-full rounded-[0.875rem] border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2 tracking-tight">
              Content Type
            </label>
            <ContentTypeChips selected={contentType} onSelect={setContentType} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 tracking-tight">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context or preferences..."
              rows={2}
              className="w-full rounded-[0.875rem] border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
            />
          </div>

          <button
            onClick={onGenerate}
            disabled={!contentIdea.trim() || isGenerating}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[0.875rem] text-sm font-medium transition-all duration-200',
              !contentIdea.trim() || isGenerating
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg'
            )}
          >
            {isGenerating ? (
              <>
                <FiLoader className="animate-spin" size={16} />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FiZap size={16} />
                <span>Generate Script</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="rounded-[0.875rem] bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Right Panel - Script Editor */}
      <div className="lg:col-span-2">
        <GlassCard className="h-full">
          {isGenerating ? (
            <ScriptSkeleton />
          ) : scriptData ? (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="p-6 space-y-5">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif font-bold text-xl text-foreground tracking-tight leading-tight">
                    {scriptData.title}
                  </h2>
                  <Badge
                    className={cn(
                      'flex-shrink-0',
                      scriptStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100'
                    )}
                  >
                    {scriptStatus === 'approved' ? 'Approved' : 'Draft'}
                  </Badge>
                </div>

                {/* Duration */}
                {scriptData.estimated_duration && (
                  <p className="text-xs text-muted-foreground">
                    Estimated Duration: {scriptData.estimated_duration}
                  </p>
                )}

                {/* Script Sections */}
                <ScriptSection
                  icon={<FiTarget size={15} />}
                  label="HOOK"
                  value={editableHook}
                  onChange={scriptStatus === 'draft' ? setEditableHook : undefined}
                  readOnly={scriptStatus === 'approved'}
                />
                <ScriptSection
                  icon={<FiAlignLeft size={15} />}
                  label="BODY"
                  value={editableBody}
                  onChange={scriptStatus === 'draft' ? setEditableBody : undefined}
                  readOnly={scriptStatus === 'approved'}
                />
                <ScriptSection
                  icon={<FiArrowRight size={15} />}
                  label="CTA"
                  value={editableCta}
                  onChange={scriptStatus === 'draft' ? setEditableCta : undefined}
                  readOnly={scriptStatus === 'approved'}
                />

                {/* Visual Notes */}
                {scriptData.visual_notes && (
                  <div className="rounded-[0.875rem] bg-muted/60 border border-border/50 p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Visual Notes
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {scriptData.visual_notes}
                    </p>
                  </div>
                )}

                {/* Approve Button */}
                {scriptStatus === 'draft' && (
                  <button
                    onClick={onApprove}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[0.875rem] bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <FiCheck size={16} />
                    <span>Approve Script</span>
                  </button>
                )}
              </div>
            </ScrollArea>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] text-center px-6">
              <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                <FiFileText size={28} className="text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/70 mb-1 tracking-tight">
                No Script Yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Enter your content idea on the left and click "Generate Script" to create a UGC-optimized script.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Prompt Tab ─────────────────────────────────────────────────────────────────
function PromptTab({
  scriptData,
  scriptStatus,
  editableHook,
  editableBody,
  editableCta,
  isGenerating,
  onGenerate,
  promptData,
  copied,
  onCopy,
  onGoToStudio,
  errorMessage,
}: {
  scriptData: ScriptData | null
  scriptStatus: 'draft' | 'approved'
  editableHook: string
  editableBody: string
  editableCta: string
  isGenerating: boolean
  onGenerate: () => void
  promptData: PromptData | null
  copied: boolean
  onCopy: () => void
  onGoToStudio: () => void
  errorMessage: string
}) {
  const [isScriptOpen, setIsScriptOpen] = useState(false)
  const hasApprovedScript = scriptData && scriptStatus === 'approved'

  if (!hasApprovedScript) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <FiFilm size={28} className="text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground/70 mb-2 tracking-tight">
            No Approved Script
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
            Approve a script first to generate a HeyGen prompt. Head to Script Studio to create and approve a script.
          </p>
          <button
            onClick={onGoToStudio}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[0.875rem] bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200"
          >
            <FiArrowLeft size={15} />
            <span>Go to Script Studio</span>
          </button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Approved Script Collapsible */}
      <Collapsible open={isScriptOpen} onOpenChange={setIsScriptOpen}>
        <GlassCard className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <FiFileText size={16} className="text-primary" />
                <span className="font-semibold text-sm tracking-tight text-foreground">
                  {scriptData?.title ?? 'Approved Script'}
                </span>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  Approved
                </Badge>
              </div>
              {isScriptOpen ? (
                <FiChevronUp size={16} className="text-muted-foreground" />
              ) : (
                <FiChevronDown size={16} className="text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 pt-0 space-y-4 border-t border-border/50">
              <div className="pt-4">
                <ScriptSection
                  icon={<FiTarget size={14} />}
                  label="HOOK"
                  value={editableHook}
                  readOnly
                />
              </div>
              <ScriptSection
                icon={<FiAlignLeft size={14} />}
                label="BODY"
                value={editableBody}
                readOnly
              />
              <ScriptSection
                icon={<FiArrowRight size={14} />}
                label="CTA"
                value={editableCta}
                readOnly
              />
              {scriptData?.visual_notes && (
                <div className="rounded-[0.875rem] bg-muted/60 border border-border/50 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Visual Notes
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {scriptData.visual_notes}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </GlassCard>
      </Collapsible>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-2.5 px-8 py-3.5 rounded-[0.875rem] text-sm font-medium transition-all duration-200',
            isGenerating
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg'
          )}
        >
          {isGenerating ? (
            <>
              <FiLoader className="animate-spin" size={18} />
              <span>Generating HeyGen Prompt...</span>
            </>
          ) : (
            <>
              <FiFilm size={18} />
              <span>Generate HeyGen Prompt</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-[0.875rem] bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
          {errorMessage}
        </div>
      )}

      {/* Prompt Output */}
      {isGenerating ? (
        <GlassCard>
          <PromptSkeleton />
        </GlassCard>
      ) : promptData ? (
        <GlassCard className="overflow-hidden">
          <ScrollArea className="h-[calc(100vh-460px)] min-h-[400px]">
            <div className="p-6 space-y-6">
              {/* Header with Copy */}
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg text-foreground tracking-tight">
                  HeyGen Video Prompt
                </h3>
                <button
                  onClick={onCopy}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-[0.625rem] text-xs font-medium transition-all duration-200',
                    copied
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              </div>

              {/* Duration & Scene Count Badges */}
              <div className="flex gap-3">
                {promptData.total_duration && (
                  <Badge variant="outline" className="text-xs">
                    Duration: {promptData.total_duration}
                  </Badge>
                )}
                {promptData.scene_count && (
                  <Badge variant="outline" className="text-xs">
                    Scenes: {promptData.scene_count}
                  </Badge>
                )}
              </div>

              {/* Overall Direction */}
              {promptData.overall_direction && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2 tracking-tight">
                    Overall Direction
                  </h4>
                  <div className="text-sm text-foreground/85 leading-relaxed">
                    {renderMarkdown(promptData.overall_direction)}
                  </div>
                </div>
              )}

              {/* Scene Breakdown */}
              {promptData.scenes && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2 tracking-tight">
                    Scene Breakdown
                  </h4>
                  <div className="text-sm text-foreground/85 leading-relaxed">
                    {renderMarkdown(promptData.scenes)}
                  </div>
                </div>
              )}

              {/* Full HeyGen Prompt */}
              {promptData.full_heygen_prompt && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2 tracking-tight">
                    Full HeyGen Prompt
                  </h4>
                  <div className="rounded-[0.875rem] bg-muted/60 border border-border/50 p-4 font-mono text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                    {promptData.full_heygen_prompt}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </GlassCard>
      ) : null}

      {/* Back to Studio */}
      <div className="text-center">
        <button
          onClick={onGoToStudio}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FiArrowLeft size={14} />
          <span>Back to Script Studio</span>
        </button>
      </div>
    </div>
  )
}

// ─── History Tab ────────────────────────────────────────────────────────────────
function HistoryTab({
  history,
  expandedId,
  onToggle,
  onReuse,
  onClear,
}: {
  history: HistoryItem[]
  expandedId: string | null
  onToggle: (id: string) => void
  onReuse: (item: HistoryItem) => void
  onClear: () => void
}) {
  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <FiInbox size={28} className="text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground/70 mb-2 tracking-tight">
            No Sessions Yet
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generate your first script to start building your history.
          </p>
        </GlassCard>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'prompt_generated':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-[11px]">
            Prompt Generated
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[11px]">
            Approved
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[11px]">
            Draft
          </Badge>
        )
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <FiClock size={18} className="text-primary" />
          <h2 className="font-serif font-bold text-lg text-foreground tracking-tight">
            Session History
          </h2>
          <Badge variant="secondary" className="text-xs">{history.length}</Badge>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[0.625rem] text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <FiTrash2 size={13} />
          <span>Clear History</span>
        </button>
      </div>

      {/* History List */}
      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-3 pr-2">
          {history.map((item) => {
            const isExpanded = expandedId === item.id
            return (
              <GlassCard key={item.id} className="overflow-hidden">
                <button
                  onClick={() => onToggle(item.id)}
                  className="w-full p-4 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate tracking-tight">
                        {(item.contentIdea ?? '').length > 80
                          ? (item.contentIdea ?? '').slice(0, 80) + '...'
                          : item.contentIdea ?? 'Untitled'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[11px]">
                          {item.contentType ?? 'General'}
                        </Badge>
                        {getStatusBadge(item.status ?? 'draft')}
                        <span className="text-[11px] text-muted-foreground">
                          {item.createdAt ? formatDate(item.createdAt) : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpanded ? (
                        <FiChevronUp size={14} className="text-muted-foreground" />
                      ) : (
                        <FiChevronDown size={14} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border/50">
                    {item.scriptData ? (
                      <div className="pt-4 space-y-3">
                        <h4 className="font-semibold text-sm text-foreground tracking-tight">
                          {item.scriptData.title ?? 'Untitled Script'}
                        </h4>
                        <ScriptSection
                          icon={<FiTarget size={13} />}
                          label="HOOK"
                          value={item.scriptData.hook ?? ''}
                          readOnly
                        />
                        <ScriptSection
                          icon={<FiAlignLeft size={13} />}
                          label="BODY"
                          value={item.scriptData.body ?? ''}
                          readOnly
                        />
                        <ScriptSection
                          icon={<FiArrowRight size={13} />}
                          label="CTA"
                          value={item.scriptData.cta ?? ''}
                          readOnly
                        />
                      </div>
                    ) : (
                      <p className="pt-4 text-sm text-muted-foreground">No script data.</p>
                    )}

                    {item.promptData?.full_heygen_prompt && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-primary tracking-tight">
                          HeyGen Prompt
                        </h4>
                        <div className="rounded-[0.875rem] bg-muted/60 border border-border/50 p-3 font-mono text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {item.promptData.full_heygen_prompt}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onReuse(item)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-[0.875rem] bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                    >
                      <FiRefreshCw size={13} />
                      <span>Reuse Idea</span>
                    </button>
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function Page() {
  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'studio' | 'prompt' | 'history'>('studio')

  // ── Sample Data Toggle ─────────────────────────────────────────────────────
  const [showSample, setShowSample] = useState(false)

  // ── Script Studio State ────────────────────────────────────────────────────
  const [contentIdea, setContentIdea] = useState('')
  const [contentType, setContentType] = useState('General')
  const [notes, setNotes] = useState('')
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [scriptErrorMessage, setScriptErrorMessage] = useState('')

  // ── Script Data ────────────────────────────────────────────────────────────
  const [scriptData, setScriptData] = useState<ScriptData | null>(null)
  const [editableHook, setEditableHook] = useState('')
  const [editableBody, setEditableBody] = useState('')
  const [editableCta, setEditableCta] = useState('')
  const [scriptStatus, setScriptStatus] = useState<'draft' | 'approved'>('draft')

  // ── Prompt Output State ────────────────────────────────────────────────────
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [promptData, setPromptData] = useState<PromptData | null>(null)
  const [copied, setCopied] = useState(false)
  const [promptErrorMessage, setPromptErrorMessage] = useState('')

  // ── History ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // ── Active Agent Tracking ──────────────────────────────────────────────────
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // ── Load History from localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ugc_pipeline_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // ── Sample Data Effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (showSample) {
      setContentIdea('How to build an AI-powered customer support chatbot without coding')
      setContentType('How-To')
      setNotes('Target audience: non-technical founders')
      setScriptData(SAMPLE_SCRIPT)
      setEditableHook(SAMPLE_SCRIPT.hook)
      setEditableBody(SAMPLE_SCRIPT.body)
      setEditableCta(SAMPLE_SCRIPT.cta)
      setScriptStatus('approved')
      setPromptData(SAMPLE_PROMPT)
      setHistory(SAMPLE_HISTORY)
    } else {
      setContentIdea('')
      setContentType('General')
      setNotes('')
      setScriptData(null)
      setEditableHook('')
      setEditableBody('')
      setEditableCta('')
      setScriptStatus('draft')
      setPromptData(null)
      // Restore real history
      try {
        const stored = localStorage.getItem('ugc_pipeline_history')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setHistory(parsed)
          } else {
            setHistory([])
          }
        } else {
          setHistory([])
        }
      } catch {
        setHistory([])
      }
    }
  }, [showSample])

  // ── Save History Helper ────────────────────────────────────────────────────
  const saveHistory = useCallback(
    (updated: HistoryItem[]) => {
      setHistory(updated)
      if (!showSample) {
        try {
          localStorage.setItem('ugc_pipeline_history', JSON.stringify(updated))
        } catch {
          // ignore storage errors
        }
      }
    },
    [showSample]
  )

  // ── Generate Script ────────────────────────────────────────────────────────
  const handleGenerateScript = async () => {
    if (!contentIdea.trim() || isGeneratingScript) return

    setIsGeneratingScript(true)
    setScriptData(null)
    setScriptStatus('draft')
    setScriptErrorMessage('')
    setPromptData(null)
    setActiveAgentId(SCRIPT_AGENT_ID)

    const message = `Content Type: ${contentType}\n\nContent Idea: ${contentIdea}${notes ? `\n\nAdditional Notes: ${notes}` : ''}`

    try {
      const result = await callAIAgent(message, SCRIPT_AGENT_ID)

      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            // leave as is
          }
        }
        const parsed: ScriptData = {
          hook: data?.hook ?? '',
          body: data?.body ?? '',
          cta: data?.cta ?? '',
          title: data?.title ?? 'Untitled Script',
          estimated_duration: data?.estimated_duration ?? '',
          visual_notes: data?.visual_notes ?? '',
        }
        setScriptData(parsed)
        setEditableHook(parsed.hook)
        setEditableBody(parsed.body)
        setEditableCta(parsed.cta)
      } else {
        setScriptErrorMessage(result?.error ?? 'Failed to generate script. Please try again.')
      }
    } catch (err) {
      setScriptErrorMessage('An unexpected error occurred. Please try again.')
    }

    setIsGeneratingScript(false)
    setActiveAgentId(null)
  }

  // ── Approve Script ─────────────────────────────────────────────────────────
  const handleApproveScript = () => {
    if (!scriptData) return

    const updatedScript: ScriptData = {
      ...scriptData,
      hook: editableHook,
      body: editableBody,
      cta: editableCta,
    }
    setScriptData(updatedScript)
    setScriptStatus('approved')

    // Save to history
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      contentIdea,
      contentType,
      notes,
      scriptData: updatedScript,
      promptData: null,
      status: 'approved',
      createdAt: new Date().toISOString(),
    }
    const updated = [historyItem, ...history]
    saveHistory(updated)

    // Switch to prompt tab
    setActiveTab('prompt')
  }

  // ── Generate HeyGen Prompt ─────────────────────────────────────────────────
  const handleGeneratePrompt = async () => {
    if (!scriptData || scriptStatus !== 'approved' || isGeneratingPrompt) return

    setIsGeneratingPrompt(true)
    setPromptData(null)
    setPromptErrorMessage('')
    setActiveAgentId(HEYGEN_AGENT_ID)

    const approvedScript = `Title: ${scriptData.title}\n\nHOOK:\n${editableHook}\n\nBODY:\n${editableBody}\n\nCTA:\n${editableCta}\n\nVisual Notes:\n${scriptData.visual_notes ?? ''}\n\nEstimated Duration: ${scriptData.estimated_duration ?? ''}`

    try {
      const result = await callAIAgent(approvedScript, HEYGEN_AGENT_ID)

      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            // leave as is
          }
        }
        const parsed: PromptData = {
          overall_direction: data?.overall_direction ?? '',
          scenes: data?.scenes ?? '',
          full_heygen_prompt: data?.full_heygen_prompt ?? '',
          total_duration: data?.total_duration ?? '',
          scene_count: data?.scene_count ?? '',
        }
        setPromptData(parsed)

        // Update history entry
        const updatedHistory = history.map((item) => {
          if (
            item.contentIdea === contentIdea &&
            item.status === 'approved'
          ) {
            return { ...item, promptData: parsed, status: 'prompt_generated' as const }
          }
          return item
        })
        saveHistory(updatedHistory)
      } else {
        setPromptErrorMessage(result?.error ?? 'Failed to generate prompt. Please try again.')
      }
    } catch {
      setPromptErrorMessage('An unexpected error occurred. Please try again.')
    }

    setIsGeneratingPrompt(false)
    setActiveAgentId(null)
  }

  // ── Copy to Clipboard ──────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!promptData?.full_heygen_prompt) return
    const success = await copyToClipboard(promptData.full_heygen_prompt)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Reuse History Item ─────────────────────────────────────────────────────
  const handleReuseIdea = (item: HistoryItem) => {
    setContentIdea(item.contentIdea ?? '')
    setContentType(item.contentType ?? 'General')
    setNotes(item.notes ?? '')
    setScriptData(null)
    setEditableHook('')
    setEditableBody('')
    setEditableCta('')
    setScriptStatus('draft')
    setPromptData(null)
    setActiveTab('studio')
  }

  // ── Clear History ──────────────────────────────────────────────────────────
  const handleClearHistory = () => {
    saveHistory([])
  }

  // ── Toggle History Expand ──────────────────────────────────────────────────
  const handleToggleHistory = (id: string) => {
    setExpandedHistoryId((prev) => (prev === id ? null : id))
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, hsl(30 50% 97%) 0%, hsl(20 45% 95%) 35%, hsl(40 40% 96%) 70%, hsl(15 35% 97%) 100%)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-[16px] bg-background/60 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-serif font-bold text-xl text-foreground tracking-tight">
              UGC Pipeline
            </h1>
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-muted-foreground">Sample Data</span>
            <Switch checked={showSample} onCheckedChange={setShowSample} />
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'studio' && (
          <StudioTab
            contentIdea={contentIdea}
            setContentIdea={setContentIdea}
            contentType={contentType}
            setContentType={setContentType}
            notes={notes}
            setNotes={setNotes}
            isGenerating={isGeneratingScript}
            onGenerate={handleGenerateScript}
            scriptData={scriptData}
            editableHook={editableHook}
            setEditableHook={setEditableHook}
            editableBody={editableBody}
            setEditableBody={setEditableBody}
            editableCta={editableCta}
            setEditableCta={setEditableCta}
            scriptStatus={scriptStatus}
            onApprove={handleApproveScript}
            errorMessage={scriptErrorMessage}
          />
        )}

        {activeTab === 'prompt' && (
          <PromptTab
            scriptData={scriptData}
            scriptStatus={scriptStatus}
            editableHook={editableHook}
            editableBody={editableBody}
            editableCta={editableCta}
            isGenerating={isGeneratingPrompt}
            onGenerate={handleGeneratePrompt}
            promptData={promptData}
            copied={copied}
            onCopy={handleCopy}
            onGoToStudio={() => setActiveTab('studio')}
            errorMessage={promptErrorMessage}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            history={history}
            expandedId={expandedHistoryId}
            onToggle={handleToggleHistory}
            onReuse={handleReuseIdea}
            onClear={handleClearHistory}
          />
        )}
      </main>

      {/* ── Agent Info Footer ───────────────────────────────────────────────── */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 pb-6">
        <AgentInfoPanel activeAgentId={activeAgentId} />
      </footer>
    </div>
  )
}
