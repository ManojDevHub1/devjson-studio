export interface PresetDataset {
  id: string;
  name: string;
  category: string;
  badge?: string;
  description: string;
  data: string;
}

export const PRESET_DATASETS: PresetDataset[] = [
  {
    id: 'saas_production',
    name: 'SaaS Production Response (Complex)',
    category: 'Enterprise API',
    badge: 'Popular',
    description: 'Multi-tenant organization API response with nested billing, team members, usage telemetry, and permissions.',
    data: JSON.stringify({
      status: "success",
      organization: {
        id: "org_98240xbf1",
        name: "Acme Cloud Technologies",
        slug: "acme-cloud",
        created_at: "2024-03-15T09:20:00.000Z",
        tier: "enterprise_scale",
        billing: {
          customer_id: "cus_N8x20a9bf",
          plan: "Enterprise Annual",
          seat_count: 145,
          mrr_usd: 12450.00,
          currency: "USD",
          auto_renew: true,
          next_invoice_at: "2027-03-15T00:00:00.000Z",
          payment_method: {
            brand: "MasterCard",
            last4: "8821",
            exp_month: 8,
            exp_year: 2029
          }
        },
        members: [
          {
            id: "usr_101",
            name: "Alex Rivera",
            email: "alex.rivera@acme.io",
            role: "owner",
            is_active: true,
            two_factor_enabled: true,
            last_login_at: "2026-10-14T21:40:12.000Z",
            teams: ["Core Infrastructure", "Security"]
          },
          {
            id: "usr_102",
            name: "Elena Rostova",
            email: "elena.r@acme.io",
            role: "billing_admin",
            is_active: true,
            two_factor_enabled: false,
            last_login_at: "2026-10-14T19:15:00.000Z",
            teams: ["Finance"]
          }
        ],
        telemetry: {
          uptime_percentage_30d: 99.992,
          api_requests_today: 4129580,
          avg_latency_ms: 14.8,
          error_rate_percent: 0.004,
          regions_deployed: ["us-east-1", "eu-central-1", "ap-southeast-1"]
        }
      },
      request_meta: {
        request_id: "req_f4819a002",
        latency_ms: 24.1,
        server_node: "edge-ewr-04",
        cached: false
      }
    }, null, 2),
  },
  {
    id: 'broken_js_object',
    name: 'Broken JS Object (Test Auto-Repair)',
    category: 'Interactive Test',
    badge: 'Dirty Syntax',
    description: 'JavaScript object with single quotes, unquoted keys, trailing commas, Python literals, and comments.',
    data: `// Demo dirty JavaScript object ready for Auto-Repair:
{
  title: 'DevJSON Studio',
  description: 'Client-side API payload inspector and code generator',
  version: 5.1,
  isProductionReady: True,
  deprecated: False,
  legacyPayload: None,
  'supportedLanguages': [
    'TypeScript AST',
    'Zod Validation',
    'JSONPath Querying',
    'Mock Service Worker',
  ],
  config: {
    timeoutMs: 3000,
    retryCount: 4,
    enableTracing: True,
  },
  // Extra metadata
  notes: 'Single quotes and unquoted keys should be double-quoted automatically',
}
`,
  },
  {
    id: 'stripe_webhook',
    name: 'Stripe Webhook Payload (Deep Nesting)',
    category: 'Fintech Webhook',
    badge: 'Deep AST',
    description: 'Realistic payment_intent.succeeded webhook event with multi-layer nested charge, customer, and routing objects.',
    data: JSON.stringify({
      id: "evt_3MtwxPEY",
      object: "event",
      api_version: "2025-08-15",
      created: 1782019400,
      type: "payment_intent.succeeded",
      livemode: true,
      pending_webhooks: 1,
      data: {
        object: {
          id: "pi_3MtwxPEY01",
          object: "payment_intent",
          amount: 89900,
          amount_received: 89900,
          currency: "usd",
          status: "succeeded",
          customer: "cus_Oia49129x8",
          description: "Enterprise License Subscription #4812",
          payment_method: "pm_1Nx982",
          charges: {
            object: "list",
            total_count: 1,
            data: [
              {
                id: "ch_3MtwxPEY01ch",
                object: "charge",
                amount: 89900,
                amount_captured: 89900,
                paid: true,
                risk_score: 12,
                risk_level: "normal",
                billing_details: {
                  name: "Sarah Jenkins",
                  email: "sarah.j@enterprise-corp.com",
                  phone: "+1-555-019-2834",
                  address: {
                    line1: "100 Montgomery St",
                    city: "San Francisco",
                    state: "CA",
                    postal_code: "94104",
                    country: "US"
                  }
                },
                outcome: {
                  network_status: "approved_by_network",
                  risk_level: "normal",
                  seller_message: "Payment complete."
                }
              }
            ]
          }
        }
      }
    }, null, 2),
  },
];
