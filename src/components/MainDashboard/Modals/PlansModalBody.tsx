// components/MainDashboard/Modals/PlansModalBody.tsx
import React, { useEffect, useRef, useState } from "react";
import { Plan } from "../../../types";
import { planService } from "../../../services/plan.service";
import { Toggle, Badge, Banner, EmptyState, Button } from "../../ui";
import { formatRupees } from "../../../utils/subscription";
import { InlineSection } from "../../Dashboard/inline";
import { getPlanDefinition } from "../../../data/plans";
import PlanDetailModal from "../../Payments/PlanDetailModal";
import local from "./Modals.module.scss";

const PlansModalBody: React.FC = () => {
  const [loaded, setLoaded] = useState<Plan[]>([]);
  const [draft, setDraft] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");

  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);

  // Track whether WE initiated the most recent broadcast, so the
  // subscription doesn't reload the list right after our own save.
  const lastSaveRef = useRef<number>(0);
  const reloadDebounceRef = useRef<number | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const list = await planService.getAllPlans({ includeInactive: true });
      setLoaded(list);
      setDraft(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    setSaveError("");
    setSuccess("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe - but skip reloads triggered by our own save, and
  // debounce rapid-fire broadcasts into a single reload.
  useEffect(() => {
    const unsubscribe = planService.subscribeToPlanChanges(() => {
      // If our own save fired this broadcast within the last second,
      // skip the reload - we already have the correct state.
      if (Date.now() - lastSaveRef.current < 1000) return;

      // Debounce: multiple broadcasts within 400ms - one reload.
      if (reloadDebounceRef.current !== null) {
        window.clearTimeout(reloadDebounceRef.current);
      }
      reloadDebounceRef.current = window.setTimeout(() => {
        reloadDebounceRef.current = null;
        loadPlans();
      }, 400);
    });

    return () => {
      unsubscribe();
      if (reloadDebounceRef.current !== null) {
        window.clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty =
    draft.length !== loaded.length ||
    draft.some((p, i) => {
      const l = loaded[i];
      return !l || l.id !== p.id || l.isActive !== p.isActive;
    });

  const toggleDraft = (planId: string, next: boolean) => {
    setDraft((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, isActive: next } : p)),
    );
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveError("");
    setSuccess("");

    // Mark the timestamp so the subscription doesn't reload after
    // our own broadcast.
    lastSaveRef.current = Date.now();

    try {
      const changes = draft
        .filter((p) => {
          const l = loaded.find((x) => x.id === p.id);
          return l && l.isActive !== p.isActive;
        })
        .map((p) => ({ id: p.id, isActive: p.isActive }));

      if (changes.length === 0) {
        setIsSaving(false);
        return;
      }

      // Single batch call: N writes, 1 broadcast.
      await planService.setMultiplePlansActive(changes);

      setLoaded(draft);
      setSuccess("Plans updated");
      window.setTimeout(() => setSuccess(""), 1500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(loaded);
    setSaveError("");
    setSuccess("");
  };

  const detailPlan = detailPlanId
    ? (draft.find((p) => p.id === detailPlanId) ?? null)
    : null;

  return (
    <>
      <InlineSection
        title="Subscription Plans"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={isSaving || !isDirty}
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              disabled={!isDirty}
            >
              Save
            </Button>
          </>
        }
      >
        {loadError && (
          <Banner variant="error" onDismiss={() => setLoadError("")}>
            {loadError}
          </Banner>
        )}
        {saveError && (
          <Banner variant="error" onDismiss={() => setSaveError("")}>
            {saveError}
          </Banner>
        )}
        {success && <Banner variant="success">{success}</Banner>}

        {isLoading && draft.length === 0 ? (
          <EmptyState title="Loading plans..." />
        ) : draft.length === 0 ? (
          <EmptyState
            title="No plans configured"
            description="Add plans in the database to see them here."
            action={
              <Button variant="secondary" onClick={loadPlans}>
                Retry
              </Button>
            }
          />
        ) : (
          <div className={local.rows}>
            {draft.map((p) => {
              const def = getPlanDefinition(p.id);
              const original = loaded.find((x) => x.id === p.id);
              const changed = original && original.isActive !== p.isActive;

              return (
                <div
                  key={p.id}
                  className={`${local.row} ${changed ? local.rowChanged : ""}`}
                >
                  <div className={local.rowText}>
                    
                    <div className={local.rowTitle}>
                      <strong>{p.name}</strong>
                      <Badge tone={p.isActive ? "success" : "danger"} size="sm">
                        {p.isActive ? "Active" : "Disabled"}
                      </Badge>
                      <span className={local.price}>
                        {formatRupees(p.monthlyPrice)}/mo
                      </span>
                    </div>
                    {def.included.length > 0 && (
                      <ul className={local.featurePreview}>
                        {def.included.slice(0, 3).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                        {def.included.length > 3 && (
                          <li className={local.featureMore}>
                            + {def.included.length - 3} more
                          </li>
                        )}
                      </ul>
                    )}
                    {def.featured && (
                      <Badge tone="info" size="sm">
                        Most popular
                      </Badge>
                    )}
                  </div>

                  <div className={local.rowActions}>
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => setDetailPlanId(p.id)}
                    >
                      View details
                    </Button>
                    <Toggle
                      checked={p.isActive}
                      disabled={isSaving}
                      onChange={(e) => toggleDraft(p.id, e.target.checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </InlineSection>

      <PlanDetailModal
        isOpen={!!detailPlan}
        onClose={() => setDetailPlanId(null)}
        planId={detailPlan?.id ?? ""}
        planName={detailPlan?.name ?? ""}
        monthlyPrice={detailPlan?.monthlyPrice}
        statusBadge={
          detailPlan
            ? {
                label: detailPlan.isActive ? "Active" : "Disabled",
                tone: detailPlan.isActive ? "success" : "danger",
              }
            : undefined
        }
      />
    </>
  );
};

export default PlansModalBody;
