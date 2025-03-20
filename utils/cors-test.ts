/**
 * Utility functions to test CORS configuration for Firebase Storage
 */

import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';
import { STORAGE_PATHS } from '../firebase/config';

/**
 * Test if a Firebase Storage URL can be accessed via fetch
 * @param url The Firebase Storage download URL to test
 * @returns Object with success status and response details
 */
export const testCorsForUrl = async (url: string): Promise<{
  success: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  error?: string;
}> => {
  try {
    // Attempt to fetch the URL with CORS mode
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Origin': window.location.origin
      }
    });
    
    // Convert headers to a simple object
    const headers: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      headers[key] = value;
    });
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};

/**
 * Test CORS configuration for a specific file in Firebase Storage
 * @param filePath Path to the file in Firebase Storage
 * @returns Test results
 */
export const testCorsForFile = async (filePath: string): Promise<{
  success: boolean;
  url?: string;
  corsTest?: Awaited<ReturnType<typeof testCorsForUrl>>;
  error?: string;
}> => {
  try {
    // Get storage reference
    const storage = getStorage();
    const fileRef = ref(storage, filePath);
    
    // Get download URL
    const url = await getDownloadURL(fileRef);
    
    // Test CORS for the URL
    const corsTest = await testCorsForUrl(url);
    
    return {
      success: corsTest.success,
      url,
      corsTest
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};

/**
 * Test CORS configuration for all PDFs in a specific path
 * @param path Path in Firebase Storage to test
 * @returns Test results for each file
 */
export const testCorsForAllPdfs = async (path: string = 'pdf_documents/'): Promise<{
  overallSuccess: boolean;
  results: Array<{
    path: string;
    success: boolean;
    details: any;
  }>;
  error?: string;
}> => {
  try {
    // Get storage reference
    const storage = getStorage();
    const pathRef = ref(storage, path);
    
    // List all items using the already imported listAll function
    const listResult = await listAll(pathRef);
    
    if (listResult.items.length === 0) {
      return {
        overallSuccess: false,
        results: [],
        error: `No files found in path: ${path}`
      };
    }
    
    // Test CORS for each item
    const results = await Promise.all(
      listResult.items.map(async (item) => {
        const itemPath = item.fullPath;
        try {
          const testResult = await testCorsForFile(itemPath);
          return {
            path: itemPath,
            success: testResult.success,
            details: testResult
          };
        } catch (error: any) {
          return {
            path: itemPath,
            success: false,
            details: { error: error.message || String(error) }
          };
        }
      })
    );
    
    // Check if all tests were successful
    const overallSuccess = results.every(result => result.success);
    
    return {
      overallSuccess,
      results
    };
  } catch (error: any) {
    return {
      overallSuccess: false,
      results: [],
      error: error.message || String(error)
    };
  }
};
