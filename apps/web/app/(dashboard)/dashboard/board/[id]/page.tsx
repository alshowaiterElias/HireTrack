"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import "./board.css";

const COLUMN_COLORS = [
  "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#10b981",
  "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#8b5cf6",
];

const SPECIAL_TYPES = ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "REJECTED"];

// ─── Sortable Card Component ────────────────────────────────
function SortableCard({ card, color, onDelete, onView }: { card: any; color: string; onDelete: (id: string) => void; onView: (card: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  return (
    <div
      ref={setNodeRef}
      className="app-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderLeft: `3px solid ${color}`,
      }}
      {...attributes}
      {...listeners}
      onClick={() => onView(card)}
    >
      <div className="app-card-company">
        <div className="app-card-logo" style={{ background: color }}>
          {card.companyName?.[0] || "?"}
        </div>
        <span className="app-card-name">{card.companyName}</span>
        <button
          className="app-card-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          title="Delete"
        >🗑</button>
      </div>
      <div className="app-card-role">{card.roleTitle}</div>
      {card.tags?.length > 0 && (
        <div className="app-card-tags">
          {card.tags.slice(0, 3).map((t: any) => (
            <span key={t.tag.id} className="app-card-tag" style={{ background: `${t.tag.color}22`, color: t.tag.color }}>
              {t.tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="app-card-meta">
        <span>{card.priority}</span>
        <span>{card.source?.replace("_", " ")}</span>
      </div>
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────

function DroppableColumn({
  column, onAddCard, onDeleteCard, onViewCard,
  onOpenSettings, settingsOpen, isFirst, isLast,
  onMoveLeft, onMoveRight,
}: {
  column: any;
  onAddCard: (columnId: string) => void;
  onDeleteCard: (id: string) => void;
  onViewCard: (card: any) => void;
  onOpenSettings: (colId: string) => void;
  settingsOpen: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const cards = column.applications || [];
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const count = cards.length;
  const wipLimit = column.wipLimit;
  const isOver_ = wipLimit && count >= wipLimit;
  const isWarn = wipLimit && count === wipLimit - 1;

  const countClass = isOver_ ? "board-col-count wip-over" : isWarn ? "board-col-count wip-warn" : "board-col-count";

  return (
    <div className={`board-column${isOver_ ? " wip-over-col" : ""}`}>
      <div className="board-col-header" style={{ position: "relative" }}>
        <div className="board-col-title">
          <button className="col-reorder-btn" onClick={onMoveLeft} disabled={isFirst} title="Move left">◀</button>
          <span className="board-col-dot" style={{ background: column.color }} />
          <span className="board-col-name">{column.name}</span>
          <button className="col-reorder-btn" onClick={onMoveRight} disabled={isLast} title="Move right">▶</button>
        </div>
        <div className="col-header-actions">
          <span className={countClass}>
            {count}{wipLimit ? `/${wipLimit}` : ""}
            {isOver_ ? " ⚠" : ""}
          </span>
          <button className="col-settings-btn" onClick={(e) => { e.stopPropagation(); onOpenSettings(column.id); }} title="Settings">⚙</button>
        </div>
      </div>
      {wipLimit && (
        <div className="col-wip-info" style={{ color: isOver_ ? "var(--danger)" : undefined }}>
          WIP Limit: {wipLimit} {isOver_ ? "— Over limit!" : ""}
        </div>
      )}
      <SortableContext items={cards.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="board-col-body"
          style={{
            background: isOver ? "hsla(var(--accent-primary-h, 250), 70%, 60%, 0.06)" : undefined,
            transition: "background 150ms ease",
          }}
        >
          <button className="board-add-card" onClick={() => onAddCard(column.id)}>
            + Add Application
          </button>
          {cards.length === 0 && <div className="board-empty">Drop cards here</div>}
          {cards.map((card: any) => (
            <SortableCard key={card.id} card={card} color={column.color} onDelete={onDeleteCard} onView={onViewCard} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Card Overlay (shown during drag) ─────────────────────────

function CardOverlay({ card }: { card: any }) {
  return (
    <div className="app-card" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)", opacity: 0.95 }}>
      <div className="app-card-company">
        <div className="app-card-logo" style={{ background: "var(--accent-primary)" }}>
          {card.companyName?.[0] || "?"}
        </div>
        <span className="app-card-name">{card.companyName}</span>
      </div>
      <div className="app-card-role">{card.roleTitle}</div>
    </div>
  );
}

// ─── Column Settings Dropdown ─────────────────────────────────

function ColumnSettingsDropdown({
  column, onSave, onDelete, onClose,
}: {
  column: any; onSave: (data: any) => void; onDelete: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(column.name);
  const [color, setColor] = useState(column.color);
  const [wipLimit, setWipLimit] = useState<string>(column.wipLimit?.toString() || "");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const isSpecial = SPECIAL_TYPES.includes(column.columnType) && column.columnType !== "CUSTOM";

  return (
    <div className="col-settings-dropdown" ref={ref} onClick={(e) => e.stopPropagation()}>
      <div>
        <label>Column Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {isSpecial && (
        <div style={{ padding: "6px 8px", background: "hsla(38, 92%, 50%, 0.08)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "#b45309" }}>
          ⚡ This column has auto-reminder features ({column.columnType.replace("_", " ")}). Changing the type will disable auto-reminders for this column.
        </div>
      )}

      <div>
        <label>Color</label>
        <div className="col-color-picker">
          {COLUMN_COLORS.map((c) => (
            <button
              key={c}
              className={`col-color-swatch${color === c ? " active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div>
        <label>WIP Limit (empty = unlimited)</label>
        <input
          className="input"
          type="number"
          min="1"
          placeholder="No limit"
          value={wipLimit}
          onChange={(e) => setWipLimit(e.target.value)}
        />
      </div>

      <div className="col-settings-actions">
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onSave({
            name: name.trim() || column.name,
            color,
            wipLimit: wipLimit ? parseInt(wipLimit) : null,
          })}
        >Save</button>
        <button
          className="btn btn-sm"
          style={{ flex: 0, background: "hsla(0, 70%, 50%, 0.1)", color: "var(--danger)", border: "none" }}
          onClick={onDelete}
        >🗑</button>
      </div>
    </div>
  );
}


// ─── Main Board Page ──────────────────────────────────────────

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { data: session } = useSession();
  const token = session?.accessToken as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToColumn, setAddToColumn] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "card" | "column" } | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [settingsColId, setSettingsColId] = useState<string | null>(null);

  // Date prompt modals
  const [datePrompt, setDatePrompt] = useState<{
    type: "interview" | "offer";
    applicationId: string;
    columnId: string;
    position: number;
    companyName: string;
    context: "drag" | "create";
  } | null>(null);
  const [promptDate, setPromptDate] = useState("");

  // Add column modal
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("#6366f1");

  // Filters
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("position");

  const [newApp, setNewApp] = useState({
    companyName: "", roleTitle: "", jobUrl: "", jobDescription: "", location: "",
    workType: "REMOTE", source: "LINKEDIN", priority: "MEDIUM",
    salaryMin: "", salaryMax: "", currency: "USD", resumeVersionId: "", coverLetter: "",
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchCampaign = useCallback(async () => {
    if (!token || !campaignId) return;
    try {
      const data = await api.getCampaign(campaignId, token);
      setCampaign(data);
    } catch {} finally { setLoading(false); }
  }, [token, campaignId]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  useEffect(() => {
    if (!token) return;
    api.getResumes(token).then(setResumes).catch(() => {});
  }, [token]);

  // ─── Column Management ─────────────────────────────────────

  const handleAddColumn = async () => {
    if (!newColName.trim() || !token) return;
    try {
      const col = await api.addColumn(campaignId, { name: newColName.trim(), color: newColColor }, token);
      setCampaign((prev: any) => ({
        ...prev,
        columns: [...prev.columns, { ...col, applications: [] }],
      }));
      setShowAddCol(false);
      setNewColName("");
    } catch {}
  };

  const handleUpdateColumn = async (columnId: string, data: any) => {
    if (!token) return;
    try {
      const updated = await api.updateColumn(columnId, data, token);
      setCampaign((prev: any) => ({
        ...prev,
        columns: prev.columns.map((c: any) => c.id === columnId ? { ...c, ...updated } : c),
      }));
      setSettingsColId(null);
    } catch {}
  };

  const handleDeleteColumn = async (columnId: string) => {
    const col = campaign?.columns?.find((c: any) => c.id === columnId);
    if (!col) return;
    const apps = col.applications || [];
    if (apps.length > 0) {
      setDeleteConfirm({ id: columnId, name: `"${col.name}" column (has ${apps.length} applications)`, type: "column" });
      return;
    }
    setDeleteConfirm({ id: columnId, name: `"${col.name}" column`, type: "column" });
  };

  const confirmDeleteColumn = async () => {
    if (!deleteConfirm || !token) return;
    const colId = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      await api.deleteColumn(colId, token);
      setCampaign((prev: any) => ({
        ...prev,
        columns: prev.columns.filter((c: any) => c.id !== colId),
      }));
      setSettingsColId(null);
    } catch (err: any) {
      alert(err?.message || "Cannot delete column with applications");
    }
  };

  const handleMoveColumn = async (colId: string, direction: -1 | 1) => {
    if (!campaign || !token) return;
    const cols = [...campaign.columns];
    const idx = cols.findIndex((c: any) => c.id === colId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= cols.length) return;

    // Swap
    [cols[idx], cols[newIdx]] = [cols[newIdx], cols[idx]];
    setCampaign((prev: any) => ({ ...prev, columns: cols }));

    try {
      await api.reorderColumns(campaignId, cols.map((c: any) => c.id), token);
    } catch {
      fetchCampaign(); // revert on error
    }
  };

  // ─── Application CRUD ──────────────────────────────────────

  const handleAddCard = (columnId: string) => {
    setAddToColumn(columnId);
    setShowAddModal(true);
    setFormSubmitted(false);
    setNewApp({ companyName: "", roleTitle: "", jobUrl: "", jobDescription: "", location: "", workType: "REMOTE", source: "LINKEDIN", priority: "MEDIUM", salaryMin: "", salaryMax: "", currency: "USD", resumeVersionId: "", coverLetter: "" });
  };

  const handleSaveCard = async () => {
    setFormSubmitted(true);
    if (!newApp.companyName || !newApp.roleTitle || !addToColumn || !token) return;
    setSaving(true);
    try {
      const body: any = { ...newApp, columnId: addToColumn };
      if (body.salaryMin) body.salaryMin = Number(body.salaryMin);
      else delete body.salaryMin;
      if (body.salaryMax) body.salaryMax = Number(body.salaryMax);
      else delete body.salaryMax;
      if (!body.resumeVersionId) delete body.resumeVersionId;
      if (!body.jobDescription) delete body.jobDescription;
      if (!body.coverLetter) delete body.coverLetter;

      const app = await api.createApplication(body, token);

      // Check if the target column needs a date prompt
      const targetCol = campaign?.columns?.find((c: any) => c.id === addToColumn);
      const colType = targetCol?.columnType;

      setCampaign((prev: any) => ({
        ...prev,
        columns: prev.columns.map((col: any) =>
          col.id === addToColumn ? { ...col, applications: [...(col.applications || []), app] } : col
        ),
      }));
      setShowAddModal(false);
      setFormSubmitted(false);

      // Prompt for dates after creation
      if (colType === "INTERVIEW") {
        setPromptDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
        setDatePrompt({ type: "interview", applicationId: app.id, columnId: addToColumn, position: 0, companyName: app.companyName, context: "create" });
      } else if (colType === "OFFER") {
        setPromptDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
        setDatePrompt({ type: "offer", applicationId: app.id, columnId: addToColumn, position: 0, companyName: app.companyName, context: "create" });
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDeleteCard = async (id: string) => {
    if (!token) return;
    const card = campaign?.columns?.flatMap((c: any) => c.applications || []).find((a: any) => a.id === id);
    setDeleteConfirm({ id, name: card?.companyName || "this application", type: "card" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !token) return;
    if (deleteConfirm.type === "column") {
      await confirmDeleteColumn();
      return;
    }
    const id = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      await api.deleteApplication(id, token);
      setCampaign((prev: any) => ({
        ...prev,
        columns: prev.columns.map((col: any) => ({
          ...col,
          applications: (col.applications || []).filter((a: any) => a.id !== id),
        })),
      }));
    } catch {}
  };

  // ─── Date Prompt Handler ─────────────────────────────────────

  const handleDatePromptSave = async () => {
    if (!datePrompt || !token || !promptDate) return;
    try {
      if (datePrompt.context === "drag") {
        // Update the move with date
        const moveData: any = { columnId: datePrompt.columnId, position: datePrompt.position };
        if (datePrompt.type === "interview") moveData.interviewDate = new Date(promptDate).toISOString();
        if (datePrompt.type === "offer") moveData.offerDeadline = new Date(promptDate).toISOString();
        await api.moveApplication(datePrompt.applicationId, moveData, token);
      } else {
        // Update application directly
        const updateData: any = {};
        if (datePrompt.type === "interview") updateData.interviewDate = new Date(promptDate).toISOString();
        if (datePrompt.type === "offer") updateData.offerDeadline = new Date(promptDate).toISOString();
        await api.updateApplication(datePrompt.applicationId, updateData, token);
      }
    } catch {}
    setDatePrompt(null);
    setPromptDate("");
  };

  const handleDatePromptSkip = async () => {
    if (!datePrompt || !token) return;
    if (datePrompt.context === "drag") {
      // Still persist move without date
      try {
        await api.moveApplication(datePrompt.applicationId, { columnId: datePrompt.columnId, position: datePrompt.position }, token);
      } catch { fetchCampaign(); }
    }
    setDatePrompt(null);
    setPromptDate("");
  };

  // ─── Drag & Drop ─────────────────────────────────────────────

  const findColumnByCardId = (cardId: string) => {
    return campaign?.columns?.find((c: any) =>
      (c.applications || []).some((a: any) => a.id === cardId)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card;
    setActiveCard(card || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !campaign) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumnByCardId(activeId);

    let destCol: any = null;
    let overCardId: string | null = null;

    if (overId.startsWith("column-")) {
      const colId = overId.replace("column-", "");
      destCol = campaign.columns.find((c: any) => c.id === colId);
    } else {
      destCol = findColumnByCardId(overId);
      overCardId = overId;
    }

    if (!sourceCol || !destCol || sourceCol.id === destCol.id) return;

    // Optimistic move between columns
    setCampaign((prev: any) => {
      const card = sourceCol.applications.find((a: any) => a.id === activeId);
      if (!card) return prev;

      return {
        ...prev,
        columns: prev.columns.map((col: any) => {
          if (col.id === sourceCol.id) {
            return { ...col, applications: col.applications.filter((a: any) => a.id !== activeId) };
          }
          if (col.id === destCol.id) {
            const apps = [...(col.applications || [])];
            if (apps.some((a: any) => a.id === activeId)) return col;
            if (overCardId) {
              const overIndex = apps.findIndex((a: any) => a.id === overCardId);
              if (overIndex >= 0) {
                apps.splice(overIndex, 0, card);
              } else {
                apps.push(card);
              }
            } else {
              apps.push(card);
            }
            return { ...col, applications: apps };
          }
          return col;
        }),
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !campaign || !token) return;

    const activeId = active.id as string;

    // Find the column that now contains the card
    const destCol = findColumnByCardId(activeId);
    if (!destCol) return;

    const position = (destCol.applications || []).findIndex((a: any) => a.id === activeId);
    const card = (destCol.applications || []).find((a: any) => a.id === activeId);
    const colType = destCol.columnType;

    // Check if we need to prompt for a date
    if (colType === "INTERVIEW") {
      setPromptDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
      setDatePrompt({
        type: "interview", applicationId: activeId, columnId: destCol.id,
        position, companyName: card?.companyName || "Company", context: "drag",
      });
      return; // Don't persist yet — wait for prompt
    }

    if (colType === "OFFER") {
      setPromptDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
      setDatePrompt({
        type: "offer", applicationId: activeId, columnId: destCol.id,
        position, companyName: card?.companyName || "Company", context: "drag",
      });
      return;
    }

    // Normal move — persist immediately
    try {
      await api.moveApplication(activeId, { columnId: destCol.id, position }, token);
    } catch {
      fetchCampaign();
    }
  };

  // ─── Filtering & Sorting ─────────────────────────────────────

  const getFilteredColumns = () => {
    if (!campaign) return [];
    return campaign.columns.map((col: any) => {
      let apps = [...(col.applications || [])];

      if (filterSource) apps = apps.filter((a: any) => a.source === filterSource);
      if (filterPriority) apps = apps.filter((a: any) => a.priority === filterPriority);

      if (sortBy === "company") apps.sort((a: any, b: any) => a.companyName.localeCompare(b.companyName));
      else if (sortBy === "date") apps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      else if (sortBy === "priority") {
        const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        apps.sort((a: any, b: any) => (order[a.priority] || 1) - (order[b.priority] || 1));
      }

      return { ...col, applications: apps };
    });
  };

  if (loading) {
    return (
      <div className="board-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading board...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="board-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>📋</div>
          <h3 style={{ marginBottom: "var(--space-2)" }}>Campaign not found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Select a campaign from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  const filteredColumns = getFilteredColumns();

  return (
    <div className="board-page">
      {/* Toolbar */}
      <div className="board-toolbar">
        <div className="board-toolbar-left">
          <span className="board-campaign-name">{campaign.name}</span>
          <span className="board-campaign-status">{campaign.status}</span>
        </div>
        <div className="board-toolbar-right">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleAddCard(campaign.columns[0]?.id)}
          >
            + Add Application
          </button>
        </div>
      </div>

      {/* Filter Bar — always visible */}
      <div className="board-filter-bar">
        <select className="input board-filter-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          <option value="LINKEDIN">LinkedIn</option>
          <option value="INDEED">Indeed</option>
          <option value="GLASSDOOR">Glassdoor</option>
          <option value="COMPANY_SITE">Company Site</option>
          <option value="REFERRAL">Referral</option>
          <option value="OTHER">Other</option>
        </select>
        <select className="input board-filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select className="input board-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="position">Default Order</option>
          <option value="company">Company A-Z</option>
          <option value="date">Newest First</option>
          <option value="priority">Priority</option>
        </select>
        {(filterSource || filterPriority) && (
          <button className="btn btn-secondary btn-sm" style={{ fontSize: "var(--text-xs)" }} onClick={() => { setFilterSource(""); setFilterPriority(""); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Kanban Board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {filteredColumns.map((col: any, idx: number) => (
            <div key={col.id} style={{ position: "relative" }}>
              <DroppableColumn
                column={col}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onViewCard={(card: any) => router.push(`/dashboard/application/${card.id}`)}
                onOpenSettings={(id) => setSettingsColId(settingsColId === id ? null : id)}
                settingsOpen={settingsColId === col.id}
                isFirst={idx === 0}
                isLast={idx === filteredColumns.length - 1}
                onMoveLeft={() => handleMoveColumn(col.id, -1)}
                onMoveRight={() => handleMoveColumn(col.id, 1)}
              />
              {settingsColId === col.id && (
                <div style={{ position: "absolute", top: 48, right: 0, zIndex: 100 }}>
                  <ColumnSettingsDropdown
                    column={col}
                    onSave={(data) => handleUpdateColumn(col.id, data)}
                    onDelete={() => { setSettingsColId(null); handleDeleteColumn(col.id); }}
                    onClose={() => setSettingsColId(null)}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add Column Button */}
          <button className="board-add-column" onClick={() => setShowAddCol(true)}>
            + Add Column
          </button>
        </div>

        <DragOverlay>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>


      {/* Add Application Modal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "var(--space-6)", animation: "scaleIn 200ms var(--ease-spring)" }}
          >
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Add Application</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Company Name *</label>
                  <input className="input" placeholder="e.g. Google" value={newApp.companyName} onChange={(e) => setNewApp({ ...newApp, companyName: e.target.value })} style={{ marginTop: 4, borderColor: formSubmitted && !newApp.companyName ? "var(--danger)" : undefined }} />
                  {formSubmitted && !newApp.companyName && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Required</span>}
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Role Title *</label>
                  <input className="input" placeholder="e.g. Senior Engineer" value={newApp.roleTitle} onChange={(e) => setNewApp({ ...newApp, roleTitle: e.target.value })} style={{ marginTop: 4, borderColor: formSubmitted && !newApp.roleTitle ? "var(--danger)" : undefined }} />
                  {formSubmitted && !newApp.roleTitle && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Required</span>}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Job URL</label>
                <input className="input" placeholder="https://..." value={newApp.jobUrl} onChange={(e) => setNewApp({ ...newApp, jobUrl: e.target.value })} style={{ marginTop: 4 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Location</label>
                  <input className="input" placeholder="e.g. Remote, NYC" value={newApp.location} onChange={(e) => setNewApp({ ...newApp, location: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Work Type</label>
                  <select className="input" value={newApp.workType} onChange={(e) => setNewApp({ ...newApp, workType: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">Onsite</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Source</label>
                  <select className="input" value={newApp.source} onChange={(e) => setNewApp({ ...newApp, source: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="LINKEDIN">LinkedIn</option><option value="INDEED">Indeed</option><option value="GLASSDOOR">Glassdoor</option><option value="ANGELLIST">AngelList</option><option value="COMPANY_SITE">Company Site</option><option value="REFERRAL">Referral</option><option value="RECRUITER">Recruiter</option><option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Priority</label>
                  <select className="input" value={newApp.priority} onChange={(e) => setNewApp({ ...newApp, priority: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Currency</label>
                  <select className="input" value={newApp.currency} onChange={(e) => setNewApp({ ...newApp, currency: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Salary Min</label>
                  <input className="input" type="number" placeholder="e.g. 80000" value={newApp.salaryMin} onChange={(e) => setNewApp({ ...newApp, salaryMin: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Salary Max</label>
                  <input className="input" type="number" placeholder="e.g. 120000" value={newApp.salaryMax} onChange={(e) => setNewApp({ ...newApp, salaryMax: e.target.value })} style={{ marginTop: 4 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Resume</label>
                <select className="input" value={newApp.resumeVersionId} onChange={(e) => setNewApp({ ...newApp, resumeVersionId: e.target.value })} style={{ marginTop: 4 }}>
                  <option value="">No resume linked</option>
                  {resumes.map((r: any) => <option key={r.id} value={r.id}>{r.label} ({r.fileName})</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Job Description</label>
                <textarea className="input" rows={3} placeholder="Paste the job description..." value={newApp.jobDescription} onChange={(e) => setNewApp({ ...newApp, jobDescription: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Cover Letter</label>
                <textarea className="input" rows={3} placeholder="Your cover letter..." value={newApp.coverLetter} onChange={(e) => setNewApp({ ...newApp, coverLetter: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAddModal(false); setFormSubmitted(false); }}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveCard} disabled={saving}>
                  {saving ? "Saving..." : "Save Application"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddCol && (
        <div
          onClick={() => setShowAddCol(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, width: "100%", padding: "var(--space-6)", animation: "scaleIn 200ms var(--ease-spring)" }}
          >
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Add Column</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Column Name</label>
                <input className="input" placeholder="e.g. Technical Round" value={newColName} onChange={(e) => setNewColName(e.target.value)} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Color</label>
                <div className="col-color-picker">
                  {COLUMN_COLORS.map((c) => (
                    <button key={c} className={`col-color-swatch${newColColor === c ? " active" : ""}`} style={{ background: c }} onClick={() => setNewColColor(c)} />
                  ))}
                </div>
              </div>
              <div style={{ padding: "8px 10px", background: "hsla(220, 70%, 50%, 0.06)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                ℹ️ New columns are custom and do not trigger auto-reminders. Only default columns (Applied, Interview, Offer, etc.) have automation features.
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddCol(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddColumn} disabled={!newColName.trim()}>Add Column</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview / Offer Date Prompt Modal */}
      {datePrompt && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, width: "100%", padding: "var(--space-6)", animation: "scaleIn 200ms var(--ease-spring)" }}
          >
            <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>
                {datePrompt.type === "interview" ? "📅" : "⏰"}
              </div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-1)" }}>
                {datePrompt.type === "interview" ? "Set Interview Date" : "Set Offer Deadline"}
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                {datePrompt.type === "interview"
                  ? `When is your interview with ${datePrompt.companyName}? We'll send a prep reminder 2 days before.`
                  : `When does the offer from ${datePrompt.companyName} expire? We'll remind you 1 day before.`
                }
              </p>
            </div>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <input
                className="input"
                type="datetime-local"
                value={promptDate}
                onChange={(e) => setPromptDate(e.target.value)}
                style={{ width: "100%", fontSize: "var(--text-md)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDatePromptSkip}>Skip</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDatePromptSave} disabled={!promptDate}>
                {datePrompt.type === "interview" ? "Set Interview Date" : "Set Offer Deadline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteConfirm}
        title={deleteConfirm?.type === "column" ? "Delete Column" : "Delete Application"}
        message={`Are you sure you want to delete ${deleteConfirm?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
