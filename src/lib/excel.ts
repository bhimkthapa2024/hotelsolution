import * as XLSX from 'xlsx';

export interface SheetConfig {
    sheetName?: string;
    data?: any[]; // For array of objects (json_to_sheet)
    rows?: any[][]; // For array of arrays (aoa_to_sheet)
    headers?: string[]; // Optional custom headers
}

export function exportToExcel(sheetsData: any[] | SheetConfig[], filename: string) {
    if (!sheetsData || sheetsData.length === 0) {
        console.warn("No data to export.");
        return;
    }

    const wb = XLSX.utils.book_new();

    // Determine if it's the new format (array of SheetConfig) or old flat format
    let processedSheets: SheetConfig[] = [];
    if (sheetsData[0] && ('data' in sheetsData[0] || 'rows' in sheetsData[0] || 'sheetName' in sheetsData[0])) {
        processedSheets = sheetsData as SheetConfig[];
    } else {
        processedSheets = [{ sheetName: "Report", data: sheetsData }];
    }

    processedSheets.forEach((sheetConfig, index) => {
        let ws: XLSX.WorkSheet;
        
        if (sheetConfig.rows) {
            // Using array of arrays
            const finalRows = sheetConfig.headers ? [sheetConfig.headers, ...sheetConfig.rows] : sheetConfig.rows;
            ws = XLSX.utils.aoa_to_sheet(finalRows);
        } else if (sheetConfig.data && sheetConfig.data.length > 0) {
            // Using array of objects
            ws = XLSX.utils.json_to_sheet(sheetConfig.data);
            if (sheetConfig.headers) {
                // Override headers if specified
                XLSX.utils.sheet_add_aoa(ws, [sheetConfig.headers], { origin: "A1" });
            }
        } else {
            // Empty sheet or unsupported structure
            ws = XLSX.utils.aoa_to_sheet([sheetConfig.headers || []]);
        }

        // Auto-size columns based on the sheet type
        const colWidths: { wch: number }[] = [];
        
        if (sheetConfig.rows) {
            const finalRows = sheetConfig.headers ? [sheetConfig.headers, ...sheetConfig.rows] : sheetConfig.rows;
            finalRows.forEach(row => {
                row.forEach((val: any, idx: number) => {
                    const valLen = val !== null && val !== undefined ? String(val).length : 0;
                    if (!colWidths[idx] || colWidths[idx].wch < valLen + 2) {
                        colWidths[idx] = { wch: Math.min(valLen + 2, 50) };
                    }
                });
            });
        } else if (sheetConfig.data && sheetConfig.data.length > 0) {
            const keys = Object.keys(sheetConfig.data[0]);
            keys.forEach((key, idx) => {
                const headerLen = sheetConfig.headers && sheetConfig.headers[idx] ? sheetConfig.headers[idx].length : key.length;
                colWidths[idx] = { wch: headerLen + 2 };
            });

            sheetConfig.data.forEach(row => {
                Object.values(row).forEach((val: any, idx: number) => {
                    const valLen = val !== null && val !== undefined ? String(val).length : 0;
                    if (!colWidths[idx] || colWidths[idx].wch < valLen + 2) {
                        colWidths[idx] = { wch: Math.min(valLen + 2, 50) };
                    }
                });
            });
        }

        ws['!cols'] = colWidths;
        
        const sName = sheetConfig.sheetName || `Sheet${index + 1}`;
        XLSX.utils.book_append_sheet(wb, ws, sName.substring(0, 31)); // excel sheet names max 31 chars
    });

    if (wb.SheetNames.length > 0) {
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
}
