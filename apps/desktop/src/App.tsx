import { useEffect, useMemo, useState } from 'react';
import {
  computeAnalyzerOutput,
  type FarmHealth,
  getExchangeAdapter,
  getExchangeOptions,
  parseLocaleNumber,
  validateInputs,
  type AnalyzerInputs,
  type ExchangeParseResult,
  type SupportedExchange
} from './core';
import { ImportCsvSection } from './components/ImportCsvSection';
import { InputsSection, type InputState } from './components/InputsSection';
import { LanguageSelector } from './components/LanguageSelector';
import { SellPlansSection } from './components/SellPlansSection';
import { SummarySection } from './components/SummarySection';
import { CustomSelect } from './components/CustomSelect';
import { detectLanguage, getSupportedLanguages, t, type Language } from './i18n';
import { exportPdfReport } from './utils/pdf-report';

const INPUTS_STORAGE_KEY = 'exchange-airdrop-analyzer.inputs.v1';

const DEFAULT_INPUT_STATE: InputState = {
  pointsOwn: '0',
  pointsFree: '0',
  pointToToken: '0.5',
  tokenPrice: '1',
  riskProfile: 'moderate'
};

function emptyParseResult(exchangeId: SupportedExchange): ExchangeParseResult {
  return {
    exchangeId,
    files: [],
    rows: []
  };
}

function parseInputState(inputState: InputState): AnalyzerInputs | null {
  const pointsOwn = parseLocaleNumber(inputState.pointsOwn);
  const pointsFree = parseLocaleNumber(inputState.pointsFree);
  const pointToToken = parseLocaleNumber(inputState.pointToToken);
  const tokenPrice = parseLocaleNumber(inputState.tokenPrice);

  if (pointsOwn === null || pointsFree === null || pointToToken === null || tokenPrice === null) {
    return null;
  }

  return {
    pointsOwn,
    pointsFree,
    pointToToken,
    tokenPrice,
    riskProfile: inputState.riskProfile
  };
}

function toUniqueFiles(files: File[]): File[] {
  const keyMap = new Map<string, File>();

  for (const file of files) {
    const key = `${file.name}::${file.size}::${file.lastModified}`;
    keyMap.set(key, file);
  }

  return [...keyMap.values()];
}

function loadPersistedInputs(): InputState {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_INPUT_STATE;
  }

  const serialized = localStorage.getItem(INPUTS_STORAGE_KEY);
  if (!serialized) {
    return DEFAULT_INPUT_STATE;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<InputState>;

    if (
      typeof parsed.pointsOwn !== 'string' ||
      typeof parsed.pointsFree !== 'string' ||
      typeof parsed.pointToToken !== 'string' ||
      typeof parsed.tokenPrice !== 'string' ||
      (parsed.riskProfile !== 'conservative' &&
        parsed.riskProfile !== 'moderate' &&
        parsed.riskProfile !== 'aggressive')
    ) {
      return DEFAULT_INPUT_STATE;
    }

    return {
      pointsOwn: parsed.pointsOwn,
      pointsFree: parsed.pointsFree,
      pointToToken: parsed.pointToToken,
      tokenPrice: parsed.tokenPrice,
      riskProfile: parsed.riskProfile
    };
  } catch {
    return DEFAULT_INPUT_STATE;
  }
}

export function App() {
  const [language, setLanguage] = useState<Language>(() =>
    detectLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined)
  );
  const [exchangeId, setExchangeId] = useState<SupportedExchange>('backpack');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parseResult, setParseResult] = useState<ExchangeParseResult>(emptyParseResult('backpack'));
  const [isParsing, setIsParsing] = useState(false);
  const [parseFailure, setParseFailure] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);
  const [inputsState, setInputsState] = useState<InputState>(() => loadPersistedInputs());

  const exchangeOptions = useMemo(() => getExchangeOptions(), []);
  const exchangeSelectOptions = useMemo(
    () => exchangeOptions.map((option) => ({ value: option.id, label: option.label })),
    [exchangeOptions]
  );
  const languageOptions = useMemo(() => getSupportedLanguages(), []);
  const translate = (key: string) => t(language, key);

  useEffect(() => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(INPUTS_STORAGE_KEY, JSON.stringify(inputsState));
  }, [inputsState]);

  useEffect(() => {
    function preventWindowDrop(event: globalThis.DragEvent) {
      event.preventDefault();
    }

    window.addEventListener('dragover', preventWindowDrop);
    window.addEventListener('drop', preventWindowDrop);

    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function runParsing() {
      if (selectedFiles.length === 0) {
        setParseResult(emptyParseResult(exchangeId));
        setParseFailure(null);
        return;
      }

      const adapter = getExchangeAdapter(exchangeId);
      setIsParsing(true);
      setParseFailure(null);

      try {
        const result = await adapter.parseFiles(selectedFiles);
        if (!isCancelled) {
          setParseResult(result);
        }
      } catch (error) {
        if (!isCancelled) {
          setParseFailure(error instanceof Error ? error.message : 'Parsing failure');
          setParseResult(emptyParseResult(exchangeId));
        }
      } finally {
        if (!isCancelled) {
          setIsParsing(false);
        }
      }
    }

    runParsing();

    return () => {
      isCancelled = true;
    };
  }, [exchangeId, selectedFiles]);

  const parsedInputs = useMemo(() => parseInputState(inputsState), [inputsState]);

  const inputErrors = useMemo(() => {
    if (!parsedInputs) {
      return [];
    }

    return validateInputs(parsedInputs);
  }, [parsedInputs]);

  const output = useMemo(() => {
    if (!parsedInputs || inputErrors.length > 0 || parseResult.rows.length === 0) {
      return null;
    }

    return computeAnalyzerOutput(parseResult, parsedInputs);
  }, [inputErrors.length, parseResult, parsedInputs]);

  const exchangeLabel = useMemo(
    () => exchangeOptions.find((option) => option.id === exchangeId)?.label ?? exchangeId,
    [exchangeId, exchangeOptions]
  );

  async function handleExportPdf() {
    if (!output) {
      return;
    }

    setIsExportingPdf(true);
    setPdfExportError(null);

    try {
      const farmStatusByHealth: Record<FarmHealth, string> = {
        strong: translate('farmStatusStrong'),
        ok: translate('farmStatusOk'),
        attention: translate('farmStatusAttention'),
        critical: translate('farmStatusCritical'),
        unknown: translate('farmStatusUnknown')
      };

      const farmMessageByHealth: Record<FarmHealth, string> = {
        strong: translate('farmMessageStrong'),
        ok: translate('farmMessageOk'),
        attention: translate('farmMessageAttention'),
        critical: translate('farmMessageCritical'),
        unknown: translate('farmMessageUnknown')
      };

      const exported = await exportPdfReport({
        appTitle: translate('appTitle'),
        summaryTitle: translate('summaryTitle'),
        exchangeLabel,
        generatedAtValue: new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date()),
        output,
        fileCount: parseResult.files.length,
        rowCount: parseResult.rows.length,
        labels: {
          exchange: translate('selectExchange'),
          generatedAt: translate('generatedAt'),
          fileCount: translate('fileCount'),
          rowCount: translate('rowCount'),
          sectionSummary: translate('summaryTitle'),
          sectionDiagnosis: translate('farmDiagnosisTitle'),
          sectionSellPlans: translate('sellPlansTitle'),
          diagnosisStatus: translate('diagnosisStatus'),
          volumeUsd: translate('volumeUsd'),
          pnlUsd: translate('pnlUsd'),
          feesUsd: translate('feesUsd'),
          pointsTotal: translate('pointsTotal'),
          tokensEstimated: translate('tokensEstimated'),
          estimatedValueUsd: translate('estimatedValueUsd'),
          costPerToken: translate('costPerToken'),
          breakEvenPrice: translate('breakEvenPrice'),
          estimatedNetProfit: translate('estimatedNetProfit'),
          roi: translate('roi'),
          roiZeroCost: translate('roiZeroCost'),
          pointsPer1m: translate('pointsPer1m'),
          farmPriceVsCost: translate('farmPriceVsCost'),
          farmNoData: translate('farmNoData'),
          sellNow: translate('sellNow'),
          hold: translate('hold'),
          tokensSell: translate('tokensSell'),
          tokensHold: translate('tokensHold'),
          lockedProfit: translate('lockedProfit'),
          futureNetProfit: translate('futureNetProfit'),
          scenarioBear: translate('scenarioBear'),
          scenarioBase: translate('scenarioBase'),
          scenarioBull: translate('scenarioBull')
        },
        planLabelByProfile: {
          conservative: translate('conservative'),
          moderate: translate('moderate'),
          aggressive: translate('aggressive')
        },
        farmStatusByHealth,
        farmMessageByHealth
      });

      if (!exported) {
        return;
      }
    } catch {
      setPdfExportError(translate('pdfExportError'));
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>{translate('appTitle')}</h1>
        </div>

        <div className="selectors">
          <label className="language-select">
            <span>{translate('selectExchange')}</span>
            <CustomSelect<SupportedExchange>
              value={exchangeId}
              onChange={setExchangeId}
              options={exchangeSelectOptions}
              ariaLabel={translate('selectExchange')}
            />
          </label>

          <LanguageSelector
            label={translate('language')}
            currentLanguage={language}
            options={languageOptions}
            onChange={setLanguage}
          />
        </div>
      </header>

      <ImportCsvSection
        title={translate('importTitle')}
        hint={translate('importHint')}
        selectFilesLabel={translate('selectFiles')}
        clearAllLabel={translate('clearAll')}
        guideButtonLabel={translate('guideButtonLabel')}
        guideModalTitle={translate('guideModalTitle')}
        guideModalIntro={translate('guideModalIntro')}
        guideAccessText={translate('guideAccessText')}
        guideAccessLinkLabel={translate('guideAccessLinkLabel')}
        guideStep1={translate('guideStep1')}
        guideStep2={translate('guideStep2')}
        guideStep3={translate('guideStep3')}
        guideStep4={translate('guideStep4')}
        guideRememberTitle={translate('guideRememberTitle')}
        guideRememberAccount={translate('guideRememberAccount')}
        guideRememberAll={translate('guideRememberAll')}
        guideRememberExport={translate('guideRememberExport')}
        guideRememberRepeat={translate('guideRememberRepeat')}
        closeLabel={translate('closeLabel')}
        removeLabel={translate('remove')}
        parsingLabel={translate('parsing')}
        noFilesLabel={translate('noFiles')}
        headers={{
          fileName: translate('fileName'),
          status: translate('status'),
          rows: translate('rows'),
          period: translate('period')
        }}
        statusLabel={{ ok: translate('statusOk'), error: translate('statusError') }}
        rowsLabel={{ valid: translate('validRows'), invalid: translate('invalidRows') }}
        files={parseResult.files}
        isParsing={isParsing}
        onAddFiles={(files) => setSelectedFiles((current) => toUniqueFiles([...current, ...files]))}
        onRemoveFile={(sourceFile) =>
          setSelectedFiles((current) => {
            const next = [...current];
            const index = next.findIndex((file) => file.name === sourceFile);
            if (index >= 0) {
              next.splice(index, 1);
            }
            return next;
          })
        }
        onClearFiles={() => setSelectedFiles([])}
      />

      <InputsSection
        title={translate('inputsTitle')}
        labels={{
          pointsOwn: translate('pointsOwn'),
          pointsFree: translate('pointsFree'),
          advancedSettings: translate('advancedSettings'),
          pointsFreeHint: translate('pointsFreeHint'),
          pointToToken: translate('pointToToken'),
          tokenPrice: translate('tokenPrice')
        }}
        state={inputsState}
        onChange={setInputsState}
      />

      {parseFailure ? <section className="panel error-box">{parseFailure}</section> : null}
      {pdfExportError ? <section className="panel error-box">{pdfExportError}</section> : null}

      {inputErrors.length > 0 ? (
        <section className="panel error-box">
          <h2>{translate('validationErrors')}</h2>
          <ul>
            {inputErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output ? (
        <>
          <SummarySection
            summaryTitle={translate('summaryTitle')}
            technicalTitle={translate('technicalTitle')}
            exportPdfLabel={translate('exportPdf')}
            exportingPdfLabel={translate('exportingPdf')}
            isExportingPdf={isExportingPdf}
            onExportPdf={handleExportPdf}
            labels={{
              volumeUsd: translate('volumeUsd'),
              pnlUsd: translate('pnlUsd'),
              feesUsd: translate('feesUsd'),
              pointsTotal: translate('pointsTotal'),
              tokensEstimated: translate('tokensEstimated'),
              estimatedValueUsd: translate('estimatedValueUsd'),
              costPerToken: translate('costPerToken'),
              costPerTokenPaid: translate('costPerTokenPaid'),
              breakEvenPrice: translate('breakEvenPrice'),
              estimatedNetProfit: translate('estimatedNetProfit'),
              roi: translate('roi'),
              roiZeroCost: translate('roiZeroCost'),
              pointsPer1m: translate('pointsPer1m'),
              byFile: translate('byFile'),
              byMarket: translate('byMarket'),
              rows: translate('rows'),
              period: translate('period'),
              market: translate('market'),
              farmDiagnosisTitle: translate('farmDiagnosisTitle'),
              farmStatusStrong: translate('farmStatusStrong'),
              farmStatusOk: translate('farmStatusOk'),
              farmStatusAttention: translate('farmStatusAttention'),
              farmStatusCritical: translate('farmStatusCritical'),
              farmStatusUnknown: translate('farmStatusUnknown'),
              farmMessageStrong: translate('farmMessageStrong'),
              farmMessageOk: translate('farmMessageOk'),
              farmMessageAttention: translate('farmMessageAttention'),
              farmMessageCritical: translate('farmMessageCritical'),
              farmMessageUnknown: translate('farmMessageUnknown'),
              farmPriceVsCost: translate('farmPriceVsCost'),
              farmNoData: translate('farmNoData'),
              farmAboveZero: translate('farmAboveZero'),
              farmBelowZero: translate('farmBelowZero')
            }}
            output={output}
            fileResults={parseResult.files}
          />

          <SellPlansSection
            title={translate('sellPlansTitle')}
            labels={{
              sellNow: translate('sellNow'),
              hold: translate('hold'),
              tokensSell: translate('tokensSell'),
              tokensHold: translate('tokensHold'),
              lockedValue: translate('lockedValue'),
              lockedProfit: translate('lockedProfit'),
              scenarioBear: translate('scenarioBear'),
              scenarioBase: translate('scenarioBase'),
              scenarioBull: translate('scenarioBull'),
              scenarioPrice: translate('scenarioPrice'),
              futureHoldValue: translate('futureHoldValue'),
              futureTotalValue: translate('futureTotalValue'),
              futureNetProfit: translate('futureNetProfit'),
              conservative: translate('conservative'),
              moderate: translate('moderate'),
              aggressive: translate('aggressive')
            }}
            plans={output.sellPlans}
          />
        </>
      ) : (
        <section className="panel subtle">{translate('noDataYet')}</section>
      )}
    </main>
  );
}
