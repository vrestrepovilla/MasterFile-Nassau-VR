"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatMoney } from "@/lib/derive";
import { saveBrokerEstimate } from "@/lib/actions/containers";

type DutyRate = {
  id: number;
  merchandise: string;
  dutyRatePercent: number;
  hsCode: string | null;
};

type ContainerOption = {
  id: number;
  containerNumber: string | null;
  status: string;
};

type SizePreset = {
  customsProcessingFee: number;
  nassauDestinationCharge: number;
  chassisUsageCharge: number;
  chassisMaintenanceRepair: number;
};

const SIZE_PRESETS: Record<string, SizePreset> = {
  "20' DV": {
    customsProcessingFee: 225.3,
    nassauDestinationCharge: 110,
    chassisUsageCharge: 120,
    chassisMaintenanceRepair: 15,
  },
  "40' HC": {
    customsProcessingFee: 107,
    nassauDestinationCharge: 50,
    chassisUsageCharge: 0,
    chassisMaintenanceRepair: 0,
  },
};

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted mt-0.5">{hint}</span>}
    </label>
  );
}

function NumberField({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      step="0.01"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={inputClass}
    />
  );
}

export function BrokerCalculator({
  dutyRates,
  containers,
}: {
  dutyRates: DutyRate[];
  containers: ContainerOption[];
}) {
  const [containerSize, setContainerSize] = useState("20' DV");
  const [targetContainerId, setTargetContainerId] = useState("");
  const [confirmFreight, setConfirmFreight] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  // Mirrors the calculated total until she edits it by hand (e.g. to round
  // it) — at that point it stops following the live calculation so her
  // rounded value doesn't get overwritten while she keeps tweaking inputs.
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetTouched, setBudgetTouched] = useState(false);

  const [fob, setFob] = useState(0);
  const [freight, setFreight] = useState(0);
  const [insurance, setInsurance] = useState(0);

  const [dutyCategoryId, setDutyCategoryId] = useState<string>("");
  const [dutyRatePercent, setDutyRatePercent] = useState(0);

  const [exciseDuties, setExciseDuties] = useState(0);
  const [customsProcessingFee, setCustomsProcessingFee] = useState(
    SIZE_PRESETS["20' DV"].customsProcessingFee,
  );
  const [customsServiceCharge, setCustomsServiceCharge] = useState(0);
  const [roadTaxContainerFee, setRoadTaxContainerFee] = useState(0);

  const [customsEntryPrep, setCustomsEntryPrep] = useState(225);
  const [documentationFee, setDocumentationFee] = useState(75);
  const [brokerExamFee, setBrokerExamFee] = useState(75);
  const [processingFee, setProcessingFee] = useState(50);
  const [copies, setCopies] = useState(5);
  const [disbursementFees, setDisbursementFees] = useState(0);
  const [localDocumentation, setLocalDocumentation] = useState(27.5);
  const [deliveryService, setDeliveryService] = useState(750);

  const [nassauDestinationCharge, setNassauDestinationCharge] = useState(
    SIZE_PRESETS["20' DV"].nassauDestinationCharge,
  );
  const [chassisUsageCharge, setChassisUsageCharge] = useState(
    SIZE_PRESETS["20' DV"].chassisUsageCharge,
  );
  const [chassisMaintenanceRepair, setChassisMaintenanceRepair] = useState(
    SIZE_PRESETS["20' DV"].chassisMaintenanceRepair,
  );
  const [bahamasAdminFee, setBahamasAdminFee] = useState(1.65);
  const [freightChargesMSC, setFreightChargesMSC] = useState(0);

  function applySizePreset(size: string) {
    setContainerSize(size);
    const preset = SIZE_PRESETS[size];
    if (preset) {
      setCustomsProcessingFee(preset.customsProcessingFee);
      setNassauDestinationCharge(preset.nassauDestinationCharge);
      setChassisUsageCharge(preset.chassisUsageCharge);
      setChassisMaintenanceRepair(preset.chassisMaintenanceRepair);
    }
  }

  function applyDutyCategory(id: string) {
    setDutyCategoryId(id);
    const rate = dutyRates.find((r) => String(r.id) === id);
    if (rate) setDutyRatePercent(rate.dutyRatePercent);
  }

  const result = useMemo(() => {
    const cif = fob + freight + insurance;
    const generalImportDuties = fob * (dutyRatePercent / 100);
    const vatOnItems = cif * 0.1;
    const vatOnFreight = freight * 0.1;
    const vatOnProcessingFees = customsProcessingFee * 0.1;

    const totalCustoms =
      generalImportDuties +
      vatOnItems +
      vatOnFreight +
      exciseDuties +
      customsProcessingFee +
      vatOnProcessingFees +
      customsServiceCharge +
      roadTaxContainerFee;

    const totalBrokerage =
      customsEntryPrep +
      documentationFee +
      brokerExamFee +
      processingFee +
      copies +
      disbursementFees +
      localDocumentation +
      deliveryService;

    const totalMscPort =
      nassauDestinationCharge + chassisUsageCharge + chassisMaintenanceRepair + bahamasAdminFee + freightChargesMSC;

    const totalCost = totalCustoms + totalBrokerage + totalMscPort;
    const logisticsOnly = totalBrokerage + totalMscPort;
    const percentOfFob = fob > 0 ? (totalCost / fob) * 100 : 0;

    return {
      cif,
      generalImportDuties,
      vatOnItems,
      vatOnFreight,
      vatOnProcessingFees,
      totalCustoms,
      totalBrokerage,
      totalMscPort,
      totalCost,
      logisticsOnly,
      percentOfFob,
    };
  }, [
    fob,
    freight,
    insurance,
    dutyRatePercent,
    exciseDuties,
    customsProcessingFee,
    customsServiceCharge,
    roadTaxContainerFee,
    customsEntryPrep,
    documentationFee,
    brokerExamFee,
    processingFee,
    copies,
    disbursementFees,
    localDocumentation,
    deliveryService,
    nassauDestinationCharge,
    chassisUsageCharge,
    chassisMaintenanceRepair,
    bahamasAdminFee,
    freightChargesMSC,
  ]);

  useEffect(() => {
    if (!budgetTouched) setBudgetAmount(result.totalCost);
  }, [result.totalCost, budgetTouched]);

  function handleBudgetChange(value: string) {
    setBudgetTouched(true);
    setBudgetAmount(value === "" ? 0 : Number(value));
  }

  function resetBudgetToCalculated() {
    setBudgetTouched(false);
    setBudgetAmount(result.totalCost);
  }

  function handleSave() {
    if (!targetContainerId) return;
    const container = containers.find((c) => String(c.id) === targetContainerId);
    startSaving(async () => {
      await saveBrokerEstimate(
        Number(targetContainerId),
        budgetAmount,
        confirmFreight ? freight : undefined,
      );
      const containerLabel = container?.containerNumber ?? "el contenedor seleccionado";
      setSaveMessage(
        confirmFreight
          ? `Guardado como Broker presupuestado (${formatMoney(budgetAmount)}) y flete confirmado (${formatMoney(freight)}) en ${containerLabel}.`
          : `Guardado como Broker presupuestado (${formatMoney(budgetAmount)}) en ${containerLabel}.`,
      );
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-6">
        <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Datos de entrada
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Tamaño de contenedor">
              <select
                value={containerSize}
                onChange={(e) => applySizePreset(e.target.value)}
                className={inputClass}
              >
                <option value="20' DV">20&apos; DV</option>
                <option value="40' HC">40&apos; HC</option>
                <option value="Otro">Otro</option>
              </select>
            </Field>
            <Field label="Valor FOB de la mercancía (USD)">
              <NumberField value={fob} onChange={setFob} />
            </Field>
            <Field label="Flete marítimo (USD)" hint="Según Sea Waybill">
              <NumberField value={freight} onChange={setFreight} />
            </Field>
            <Field label="Seguro (USD)" hint="Si aplica">
              <NumberField value={insurance} onChange={setInsurance} />
            </Field>
            <Field label="Valor CIF (calculado)">
              <div className={`${inputClass} bg-background font-medium`}>{formatMoney(result.cif)}</div>
            </Field>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Sección 1 — Bahamas Customs (Duties + VAT)
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Categoría de mercancía (Duty)" hint="Elige de la tabla de tasas">
              <select
                value={dutyCategoryId}
                onChange={(e) => applyDutyCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">Manual / otra</option>
                {dutyRates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.merchandise} ({r.dutyRatePercent}%)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duty rate (%)" hint="Se autocompleta, editable">
              <NumberField value={dutyRatePercent} onChange={setDutyRatePercent} />
            </Field>
            <Field label="General Import Duties" hint="FOB × Duty rate">
              <div className={`${inputClass} bg-background font-medium`}>
                {formatMoney(result.generalImportDuties)}
              </div>
            </Field>
            <Field label="VAT on Items" hint="10% del valor CIF">
              <div className={`${inputClass} bg-background`}>{formatMoney(result.vatOnItems)}</div>
            </Field>
            <Field label="VAT on Freight" hint="10% del flete">
              <div className={`${inputClass} bg-background`}>{formatMoney(result.vatOnFreight)}</div>
            </Field>
            <Field label="Excise Duties" hint="Ej. Car Mats 60%">
              <NumberField value={exciseDuties} onChange={setExciseDuties} />
            </Field>
            <Field label="Processing Fees (Bahamas Customs)">
              <NumberField value={customsProcessingFee} onChange={setCustomsProcessingFee} />
            </Field>
            <Field label="VAT on Processing Fees" hint="10%, automático">
              <div className={`${inputClass} bg-background`}>{formatMoney(result.vatOnProcessingFees)}</div>
            </Field>
            <Field label="Customs Service Charge (CSC)" hint="Solo en concesiones">
              <NumberField value={customsServiceCharge} onChange={setCustomsServiceCharge} />
            </Field>
            <Field label="Road Tax Container Fee (RTCF)" hint="Por contenedor si aplica">
              <NumberField value={roadTaxContainerFee} onChange={setRoadTaxContainerFee} />
            </Field>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Sección 2 — Brokerage Fees
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Customs Entry Preparation">
              <NumberField value={customsEntryPrep} onChange={setCustomsEntryPrep} />
            </Field>
            <Field label="Documentation Fee" hint="Por B/L">
              <NumberField value={documentationFee} onChange={setDocumentationFee} />
            </Field>
            <Field label="Broker Examination Fee" hint="Por declaración">
              <NumberField value={brokerExamFee} onChange={setBrokerExamFee} />
            </Field>
            <Field label="Processing Fee">
              <NumberField value={processingFee} onChange={setProcessingFee} />
            </Field>
            <Field label="Copies">
              <NumberField value={copies} onChange={setCopies} />
            </Field>
            <Field label="Disbursement Fees" hint="Variable según pagos realizados">
              <NumberField value={disbursementFees} onChange={setDisbursementFees} />
            </Field>
            <Field label="Local Documentation" hint="Gladstone Warehouse">
              <NumberField value={localDocumentation} onChange={setLocalDocumentation} />
            </Field>
            <Field label="Delivery Service" hint="1 contenedor">
              <NumberField value={deliveryService} onChange={setDeliveryService} />
            </Field>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Sección 3 — MSC Port Charges (Arawak Cay Terminal)
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Nassau Destination Charge (NDC)">
              <NumberField value={nassauDestinationCharge} onChange={setNassauDestinationCharge} />
            </Field>
            <Field label="Chassis Usage Charge (CUC)" hint="Normalmente solo 20'">
              <NumberField value={chassisUsageCharge} onChange={setChassisUsageCharge} />
            </Field>
            <Field label="Chassis Maintenance & Repair" hint="Normalmente solo 20'">
              <NumberField value={chassisMaintenanceRepair} onChange={setChassisMaintenanceRepair} />
            </Field>
            <Field label="Bahamas Admin Fee + VAT" hint="Por B/L">
              <NumberField value={bahamasAdminFee} onChange={setBahamasAdminFee} />
            </Field>
            <Field label="Freight Charges MSC" hint="Si no viene prepaid">
              <NumberField value={freightChargesMSC} onChange={setFreightChargesMSC} />
            </Field>
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-6 space-y-4">
        <div className="bg-ink text-white rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Resumen estimado
          </h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Bahamas Customs</span>
              <span>{formatMoney(result.totalCustoms)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Brokerage</span>
              <span>{formatMoney(result.totalBrokerage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">MSC Port Charges</span>
              <span>{formatMoney(result.totalMscPort)}</span>
            </div>
          </div>
          <div className="border-t border-white/15 pt-3">
            <p className="text-xs text-white/60">Costo total estimado del embarque</p>
            <p className="text-2xl font-semibold text-brand">{formatMoney(result.totalCost)}</p>
          </div>
          <div className="border-t border-white/15 pt-3 space-y-1.5">
            <p className="text-xs text-white/60">Monto a guardar como Broker presupuestado</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => handleBudgetChange(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {budgetTouched && (
                <button
                  type="button"
                  onClick={resetBudgetToCalculated}
                  className="shrink-0 text-xs text-white/60 hover:text-white whitespace-nowrap"
                >
                  Usar calculado
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/50">
              Puedes ajustarlo a un valor más redondo antes de guardarlo.
            </p>
          </div>
          <div className="border-t border-white/15 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Solo logística (sin Customs)</span>
              <span>{formatMoney(result.logisticsOnly)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">% del valor FOB</span>
              <span>{result.percentOfFob.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Guardar como Broker presupuestado
          </h2>
          <select
            value={targetContainerId}
            onChange={(e) => {
              setTargetContainerId(e.target.value);
              setSaveMessage(null);
            }}
            className={inputClass}
          >
            <option value="">Elige un contenedor…</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.containerNumber ?? `Sin número (#${c.id})`} — {c.status}
              </option>
            ))}
          </select>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={confirmFreight}
              onChange={(e) => {
                setConfirmFreight(e.target.checked);
                setSaveMessage(null);
              }}
              className="mt-0.5"
            />
            <span>
              Confirmar también el flete marítimo ({formatMoney(freight)}) como costo real del
              contenedor
            </span>
          </label>
          <button
            type="button"
            disabled={!targetContainerId || isSaving}
            onClick={handleSave}
            className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Guardando…" : `Guardar ${formatMoney(budgetAmount)}`}
          </button>
          {saveMessage && <p className="text-xs text-emerald-600">{saveMessage}</p>}
        </div>

        <p className="text-xs text-muted px-1">
          Esta es una estimación de referencia basada en el histórico de facturas de Shop N Ship /
          Bahamas Customs. El costo real puede variar.
        </p>
      </div>
    </div>
  );
}
