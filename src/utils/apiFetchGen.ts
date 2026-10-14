export type HttpLibrary = 'fetch' | 'axios';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiFetchOptions {
  library: HttpLibrary;
  method: HttpMethod;
  endpointUrl: string;
  typeName: string;
  includeAuthHeader: boolean;
  includeTryCatch: boolean;
}

export function generateApiFetchCode(options: ApiFetchOptions): string {
  const {
    library,
    method,
    endpointUrl = 'https://api.example.com/v1/resource',
    typeName = 'ApiResponse',
    includeAuthHeader = false,
    includeTryCatch = true,
  } = options;

  const authLine = includeAuthHeader ? `      'Authorization': 'Bearer YOUR_API_TOKEN',\n` : '';
  const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(method);
  const functionName = `fetch${typeName}`;

  if (library === 'fetch') {
    if (includeTryCatch) {
      return `// Fetch API Client Implementation
import type { ${typeName} } from './types';

export async function ${functionName}(${isBodyMethod ? 'payload?: unknown' : ''}): Promise<${typeName}> {
  try {
    const response = await fetch('${endpointUrl}', {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
${authLine}      },${isBodyMethod ? `\n      body: payload ? JSON.stringify(payload) : undefined,` : ''}
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(\`HTTP \${response.status}: \${errorText || response.statusText}\`);
    }

    const data: ${typeName} = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to ${functionName.toLowerCase()}:', error);
    throw error;
  }
}
`;
    } else {
      return `// Fetch API Client Implementation
import type { ${typeName} } from './types';

export async function ${functionName}(${isBodyMethod ? 'payload?: unknown' : ''}): Promise<${typeName}> {
  const response = await fetch('${endpointUrl}', {
    method: '${method}',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
${authLine}    },${isBodyMethod ? `\n    body: payload ? JSON.stringify(payload) : undefined,` : ''}
  });

  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }

  return response.json() as Promise<${typeName}>;
}
`;
    }
  } else {
    // Axios
    if (includeTryCatch) {
      return `// Axios Client Implementation
import axios, { type AxiosResponse } from 'axios';
import type { ${typeName} } from './types';

export async function ${functionName}(${isBodyMethod ? 'payload?: unknown' : ''}): Promise<${typeName}> {
  try {
    const response: AxiosResponse<${typeName}> = await axios.${method.toLowerCase()}(
      '${endpointUrl}'${isBodyMethod ? ',\n      payload' : ''},
      {
        headers: {
          'Content-Type': 'application/json',
${authLine}        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error status:', error.response?.status, error.response?.data);
    }
    throw error;
  }
}
`;
    } else {
      return `// Axios Client Implementation
import axios, { type AxiosResponse } from 'axios';
import type { ${typeName} } from './types';

export async function ${functionName}(${isBodyMethod ? 'payload?: unknown' : ''}): Promise<${typeName}> {
  const response: AxiosResponse<${typeName}> = await axios.${method.toLowerCase()}(
    '${endpointUrl}'${isBodyMethod ? ',\n    payload' : ''},
    {
      headers: {
        'Content-Type': 'application/json',
${authLine}      },
    }
  );

  return response.data;
}
`;
    }
  }
}
