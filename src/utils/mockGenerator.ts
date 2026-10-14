export type MockEngineType = 'fetch' | 'axios' | 'msw';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiMockOptions {
  engine: MockEngineType;
  method: HttpMethod;
  endpointUrl: string;
  typeName: string;
  includeAuthHeader: boolean;
  includeTryCatch: boolean;
  rawJsonSample?: string;
}

export function generateApiAndMockCode(options: ApiMockOptions): string {
  const {
    engine,
    method,
    endpointUrl = 'https://api.example.com/v1/resource',
    typeName = 'ApiResponse',
    includeAuthHeader = false,
    includeTryCatch = true,
    rawJsonSample = '{\n  "status": "success"\n}',
  } = options;

  const authLine = includeAuthHeader ? `      'Authorization': 'Bearer YOUR_API_TOKEN',\n` : '';
  const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(method);
  const functionName = `fetch${typeName}`;

  if (engine === 'fetch') {
    if (includeTryCatch) {
      return `// Native Fetch API Client
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
    console.error('Failed to execute ${functionName}:', error);
    throw error;
  }
}
`;
    } else {
      return `// Native Fetch API Client
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
  }

  if (engine === 'axios') {
    return `// Axios Client Implementation
import axios, { type AxiosResponse } from 'axios';
import type { ${typeName} } from './types';

export async function ${functionName}(${isBodyMethod ? 'payload?: unknown' : ''}): Promise<${typeName}> {
  ${includeTryCatch ? 'try {\n    ' : ''}const response: AxiosResponse<${typeName}> = await axios.${method.toLowerCase()}(
    '${endpointUrl}'${isBodyMethod ? ',\n    payload' : ''},
    {
      headers: {
        'Content-Type': 'application/json',
${authLine}      },
    }
  );

  return response.data;${includeTryCatch ? `\n  } catch (error) {\n    if (axios.isAxiosError(error)) {\n      console.error('Axios error status:', error.response?.status, error.response?.data);\n    }\n    throw error;\n  }` : ''}
}
`;
  }

  // MSW v2 (Mock Service Worker)
  // Formatted mock data
  const formattedSample = rawJsonSample.split('\n').map(l => '  ' + l).join('\n');

  return `// Mock Service Worker (MSW v2) Handler
// Install: npm install msw --save-dev
import { http, HttpResponse } from 'msw';
import type { ${typeName} } from './types';

export const mock${typeName}Data: ${typeName} = ${formattedSample.trim()};

export const handlers = [
  http.${method.toLowerCase()}('${endpointUrl}', ({ request }) => {
    // Optional: Inspect request headers or query params
    // const authHeader = request.headers.get('Authorization');

    return HttpResponse.json(mock${typeName}Data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Provider': 'DevJSON-Studio-v2',
      },
    });
  }),
];
`;
}
