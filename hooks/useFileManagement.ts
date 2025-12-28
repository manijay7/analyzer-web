import { useState, useEffect, useCallback } from "react";
import {
  Transaction,
  Side,
  TransactionStatus,
  SystemSnapshot,
  User,
} from "@/lib/types";
import { STORAGE_KEY } from "@/lib/constants";

export interface FileManagementState {
  importedFiles: any[];
  selectedFileId: string;
  availableSheets: any[];
  selectedSheetId: string;
  selectedDate: string;
  lockedDate: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  sheetMetadata: Record<string, any> | null;
}

export interface FileManagementActions {
  setImportedFiles: (files: any[]) => void;
  setSelectedFileId: (id: string) => void;
  setAvailableSheets: (sheets: any[]) => void;
  setSelectedSheetId: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setLockedDate: (date: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  setSheetMetadata: (metadata: Record<string, any> | null) => void;
  fetchImportedFiles: () => Promise<void>;
  handleFileChange: (fileId: string) => void;
  handleSheetChange: (
    sheetId: string,
    currentUser: User,
    setTransactions: (txs: Transaction[]) => void,
    setSelectedLeftIds: (ids: Set<string>) => void,
    setSelectedRightIds: (ids: Set<string>) => void,
    setSelectedHistoryIds: (ids: Set<string>) => void,
    setMatches: (matches: any[]) => void,
    setMatchComment: (comment: string) => void,
    setHistoryStack: (stack: string[]) => void,
    setFutureStack: (stack: string[]) => void,
    createSnapshot: (
      label: string,
      type: "IMPORT" | "MANUAL" | "AUTO",
      txs: Transaction[],
      matchGroups: any[]
    ) => SystemSnapshot,
    addAuditLog: (action: string, details: string) => void,
    isPeriodLocked: (date: string) => boolean
  ) => Promise<void>;
  loadData: (
    sheetId: string,
    currentUser: User,
    setTransactions: (txs: Transaction[]) => void,
    setSelectedLeftIds: (ids: Set<string>) => void,
    setSelectedRightIds: (ids: Set<string>) => void,
    setSelectedHistoryIds: (ids: Set<string>) => void,
    setMatches: (matches: any[]) => void,
    setMatchComment: (comment: string) => void,
    setHistoryStack: (stack: string[]) => void,
    setFutureStack: (stack: string[]) => void,
    createSnapshot: (
      label: string,
      type: "IMPORT" | "MANUAL" | "AUTO",
      txs: Transaction[],
      matchGroups: any[]
    ) => SystemSnapshot,
    addAuditLog: (action: string, details: string) => void,
    isPeriodLocked: (date: string) => boolean
  ) => Promise<void>;
}

export const useFileManagement = (
  status: any
): [FileManagementState, FileManagementActions] => {
  const [importedFiles, setImportedFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<any[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [lockedDate, setLockedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sheetMetadata, setSheetMetadata] = useState<Record<
    string,
    any
  > | null>(null);

  // Function to fetch imported files from database
  const fetchImportedFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions/sheets");
      if (!response.ok) {
        throw new Error("Failed to fetch imported files");
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setImportedFiles(result.data);
        console.log(
          `[useFileManagement] Refreshed imported files: ${result.data.length} files found`
        );
      }
    } catch (err) {
      console.log("Could not fetch imported files:", err);
    }
  }, []);

  // Handler for file selection change
  const handleFileChange = useCallback(
    (fileId: string) => {
      setSelectedFileId(fileId);
      setSelectedSheetId("");
      setAvailableSheets([]);

      // If no file selected, clear transactions and metadata
      if (!fileId) {
        // These will be handled by the parent component
        return;
      }

      const selectedFile = importedFiles.find((f) => f.id === fileId);
      if (selectedFile && selectedFile.sheets) {
        setAvailableSheets(selectedFile.sheets);
        // Note: No auto-select, user must manually choose a sheet
      }
    },
    [importedFiles]
  );

  // Handler for sheet selection change - auto-load data
  const handleSheetChange = useCallback(
    async (
      sheetId: string,
      currentUser: User,
      setTransactions: (txs: Transaction[]) => void,
      setSelectedLeftIds: (ids: Set<string>) => void,
      setSelectedRightIds: (ids: Set<string>) => void,
      setSelectedHistoryIds: (ids: Set<string>) => void,
      setMatches: (matches: any[]) => void,
      setMatchComment: (comment: string) => void,
      setHistoryStack: (stack: string[]) => void,
      setFutureStack: (stack: string[]) => void,
      createSnapshot: (
        label: string,
        type: "IMPORT" | "MANUAL" | "AUTO",
        txs: Transaction[],
        matchGroups: any[]
      ) => SystemSnapshot,
      addAuditLog: (action: string, details: string) => void,
      isPeriodLocked: (date: string) => boolean
    ) => {
      setSelectedSheetId(sheetId);

      // If no sheet selected, clear transactions and metadata
      if (!sheetId) {
        setTransactions([]);
        setSelectedLeftIds(new Set());
        setSelectedRightIds(new Set());
        setSelectedHistoryIds(new Set());
        setMatches([]);
        setMatchComment("");
        setSheetMetadata(null);
        return;
      }

      // Auto-load data for selected sheet
      await loadData(
        sheetId,
        currentUser,
        setTransactions,
        setSelectedLeftIds,
        setSelectedRightIds,
        setSelectedHistoryIds,
        setMatches,
        setMatchComment,
        setHistoryStack,
        setFutureStack,
        createSnapshot,
        addAuditLog,
        isPeriodLocked
      );
    },
    []
  );

  // Updated loadData to load from database instead of mock data
  const loadData = useCallback(
    async (
      sheetId: string,
      currentUser: User,
      setTransactions: (txs: Transaction[]) => void,
      setSelectedLeftIds: (ids: Set<string>) => void,
      setSelectedRightIds: (ids: Set<string>) => void,
      setSelectedHistoryIds: (ids: Set<string>) => void,
      setMatches: (matches: any[]) => void,
      setMatchComment: (comment: string) => void,
      setHistoryStack: (stack: string[]) => void,
      setFutureStack: (stack: string[]) => void,
      createSnapshot: (
        label: string,
        type: "IMPORT" | "MANUAL" | "AUTO",
        txs: Transaction[],
        matchGroups: any[]
      ) => SystemSnapshot,
      addAuditLog: (action: string, details: string) => void,
      isPeriodLocked: (date: string) => boolean
    ) => {
      if (!sheetId) {
        alert("Please select a file and sheet to load");
        return;
      }

      if (selectedDate && isPeriodLocked(selectedDate)) {
        console.log("Loading data for a closed period");
      }

      // Save checkpoint logic would be handled by the reconciliation hook

      setIsLoading(true);
      try {
        // Fetch sheet data from database
        const response = await fetch(
          `/api/transactions/sheets?sheetId=${sheetId}`
        );
        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to load sheet data");
        }

        const sheetData = result.data;

        // Convert imported transactions to app Transaction format
        const convertToTransaction = (
          imported: any,
          side: Side
        ): Transaction => ({
          id: `${side === Side.Left ? "L" : "R"}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          date: imported.date,
          description: imported.description,
          amount: imported.amount,
          reference: imported.reference || imported.glRefNo,
          side: side,
          status: TransactionStatus.Unmatched,
          importedBy: currentUser.id,
          // Include Excel fields for DR/CR detection
          sn: imported.sn,
          glRefNo: imported.glRefNo,
          aging: imported.aging,
          recon: imported.recon,
        });

        // Convert GL transactions (Left side)
        const leftTxs: Transaction[] = [
          ...sheetData.glTransactions.intCr.map((t: any) =>
            convertToTransaction(t, Side.Left)
          ),
          ...sheetData.glTransactions.intDr.map((t: any) =>
            convertToTransaction(t, Side.Left)
          ),
        ];

        // Convert Statement transactions (Right side)
        const rightTxs: Transaction[] = [
          ...sheetData.statementTransactions.extDr.map((t: any) =>
            convertToTransaction(t, Side.Right)
          ),
          ...sheetData.statementTransactions.extCr.map((t: any) =>
            convertToTransaction(t, Side.Right)
          ),
        ];

        const allTxs = [...leftTxs, ...rightTxs];

        setTransactions(allTxs);
        setSelectedLeftIds(new Set());
        setSelectedRightIds(new Set());
        setSelectedHistoryIds(new Set());
        setMatches([]);
        setMatchComment("");
        setHistoryStack([]);
        setFutureStack([]);

        // Store sheet metadata
        setSheetMetadata(sheetData.metadata || {});

        // Update date from sheet metadata
        const sheetDate =
          sheetData.reportingDate || new Date().toISOString().split("T")[0];
        setSelectedDate(sheetDate);

        createSnapshot(`Import: ${sheetData.name}`, "IMPORT", allTxs, []);

        addAuditLog(
          "Import",
          `Loaded ${allTxs.length} transactions from sheet "${sheetData.name}" by ${currentUser.name}`
        );
      } catch (e) {
        console.error("Failed to load transactions", e);
        alert("Failed to load transaction data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDate]
  );

  // Initialize and load from localStorage
  useEffect(() => {
    // Set initial date on client only to avoid hydration mismatch
    setSelectedDate(new Date().toISOString().split("T")[0]);

    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.selectedDate) setSelectedDate(parsed.selectedDate);
        if (parsed.lockedDate !== undefined) setLockedDate(parsed.lockedDate);
      } catch (e) {
        console.error("Failed to restore file management session", e);
      }
    }

    // Attempt to fetch real imported files if authenticated
    if (status === "authenticated") {
      fetchImportedFiles();
    }

    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Save to local storage on change
  useEffect(() => {
    if (!isInitialized) return;
    const stateToSave = {
      selectedDate,
      lockedDate,
      timestamp: Date.now(),
    };
    // Merge with existing storage
    const existingData = localStorage.getItem(STORAGE_KEY);
    let parsed = {};
    if (existingData) {
      try {
        parsed = JSON.parse(existingData);
      } catch (e) {
        console.error("Failed to parse existing storage", e);
      }
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, ...stateToSave })
    );
  }, [selectedDate, lockedDate, isInitialized]);

  const state: FileManagementState = {
    importedFiles,
    selectedFileId,
    availableSheets,
    selectedSheetId,
    selectedDate,
    lockedDate,
    isLoading,
    isInitialized,
    sheetMetadata,
  };

  const actions: FileManagementActions = {
    setImportedFiles,
    setSelectedFileId,
    setAvailableSheets,
    setSelectedSheetId,
    setSelectedDate,
    setLockedDate,
    setIsLoading,
    setIsInitialized,
    setSheetMetadata,
    fetchImportedFiles,
    handleFileChange,
    handleSheetChange,
    loadData,
  };

  return [state, actions];
};
