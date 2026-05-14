// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 Constants
// System prompt, tool definitions (Anthropic + OpenAI/ElevenLabs formats)
// ═══════════════════════════════════════════════════════════════════════════

// ── Rocko personality & operator context ─────────────────────────────────────
export const ROCKO_V2_SYSTEM_PROMPT = `You are Rocko, Ben Greenwood's AI assistant. You're an Aussie mate — sarcastic, direct, not a yes-man. Max 1 Australianism per response ("G'day", "no worries", "reckon", "fair dinkum" — but never overdo it). You keep Ben on track without sugarcoating.

Ben is mid-build on a 6x6 Arocs expedition truck (RBTR — Rock Bottom to Roaming), managing 4 businesses simultaneously:

**PSNM (Pallet Storage Near Me)** — warehouse storage business, cold outreach to 206 Atlas v3 prospects, survival mode, needs bookings now.

**RBTR Atlas v3** — AI-powered outreach system for PSNM, currently running drafts + sends to prospects. 206 prospects loaded, dozens drafted, waiting for replies.

**Forge** — subscription platform for overland truck builds (launching soon).

**Booking Proof** — customer self-service portal for PSNM bookings.

**Marketplace** — Buy/sell platform for truck parts (Phases 0-7 of 8 complete).

Ben is time-poor, cash-poor, learning fast. He's in workshop 2-4 hours/day with hands occupied, needs voice-first answers. You have access to his Gmail, Calendar, Supabase data (all PSNM/RBTR/Forge/Booking Proof tables), Obsidian notes, and can fire yolo builds via Claude Code.

**Your job:** Give Ben the info he needs to make decisions fast. Don't lecture. Don't add fluff. If he asks "What's blocking Forge?" — tell him the 2-3 actual blockers, not a motivational speech.

**Tool use:** You have 21 tools. Use them. If Ben asks about Gmail, call gmail_search. If he asks about money, call fetch_money_position. Don't guess data — fetch it.

**Response style:** 2-4 sentences max unless Ben explicitly asks for detail. Aussie tone but professional. Not a chatbot — an operator assistant.`;

// ── Tool definitions — Anthropic format ──────────────────────────────────────
export const ROCKO_V2_TOOLS_ANTHROPIC = [
  // Existing 15 tools
  {
    name: 'fetch_money_position',
    description: 'Get current cash position across all accounts (PSNM, personal, RBTR)',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'fetch_truck_build_progress',
    description: 'Get RBTR truck build status — current phase, blockers, next milestones',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'fetch_sponsor_pipeline',
    description: 'Get RBTR sponsor outreach pipeline status — contacted, replied, committed',
    input_schema: {
      type: 'object',
      properties: {
        status_filter: {
          type: 'string',
          enum: ['all', 'contacted', 'replied', 'committed', 'declined'],
          description: 'Filter sponsors by status'
        }
      },
      required: []
    }
  },
  {
    name: 'fetch_booking_proof_status',
    description: 'Get Booking Proof customer portal status — active customers, pending signups',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'fetch_forge_bookings',
    description: 'Get Forge subscription bookings — current subscribers, revenue',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'fetch_ww_enquiries',
    description: 'Get WarehouseWorld enquiries — new leads from PSNM site',
    input_schema: {
      type: 'object',
      properties: {
        days_back: {
          type: 'number',
          description: 'How many days of enquiries to fetch (default 7)'
        }
      },
      required: []
    }
  },
  {
    name: 'search_supabase',
    description: 'Search any Supabase table with filters — flexible query tool',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name (e.g. atlas_v3_prospects, rbtr_tasks)'
        },
        filters: {
          type: 'object',
          description: 'PostgREST filters (e.g. {status: "eq.active"})'
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20)'
        }
      },
      required: ['table']
    }
  },
  {
    name: 'fetch_recent_replies',
    description: 'Get recent replies to Atlas v3 outreach emails — who responded, when, sentiment',
    input_schema: {
      type: 'object',
      properties: {
        days_back: {
          type: 'number',
          description: 'Days to look back (default 7)'
        }
      },
      required: []
    }
  },
  {
    name: 'fetch_active_builds_running',
    description: 'Check if any yolo builds are currently running in background',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_obsidian_doc',
    description: 'Read a specific Obsidian note from RBTR-Brain',
    input_schema: {
      type: 'object',
      properties: {
        note_path: {
          type: 'string',
          description: 'Relative path from ~/Documents/RBTR-Brain/ (e.g. "00-Inbox/SESSION-CLOSE-2026-05-14.md")'
        }
      },
      required: ['note_path']
    }
  },
  {
    name: 'write_obsidian_note',
    description: 'Write or append to an Obsidian note in RBTR-Brain',
    input_schema: {
      type: 'object',
      properties: {
        note_path: {
          type: 'string',
          description: 'Relative path from ~/Documents/RBTR-Brain/'
        },
        content: {
          type: 'string',
          description: 'Markdown content to write'
        },
        mode: {
          type: 'string',
          enum: ['write', 'append'],
          description: 'Write (overwrite) or append'
        }
      },
      required: ['note_path', 'content']
    }
  },
  {
    name: 'git_status',
    description: 'Get git status for rbtr-command repo — current branch, uncommitted changes',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'run_build_progress',
    description: 'Check progress of a running yolo build by ID',
    input_schema: {
      type: 'object',
      properties: {
        build_id: {
          type: 'string',
          description: 'Build ID from previous fire'
        }
      },
      required: ['build_id']
    }
  },
  {
    name: 'run_cron_check',
    description: 'Check when cron jobs last ran (morning brief, backups, etc)',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'approve_atlas_draft',
    description: 'Approve a drafted Atlas v3 email for sending',
    input_schema: {
      type: 'object',
      properties: {
        prospect_id: {
          type: 'string',
          description: 'UUID of prospect'
        }
      },
      required: ['prospect_id']
    }
  },

  // New 6 tools for v2
  {
    name: 'gmail_search',
    description: 'Search Gmail inbox — find emails by query, sender, subject',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (e.g. "from:supplier@example.com subject:quote")'
        },
        max_results: {
          type: 'number',
          description: 'Max results to return (default 10)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'gmail_read',
    description: 'Read full email body + attachments by message ID',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'Gmail message ID from gmail_search'
        }
      },
      required: ['message_id']
    }
  },
  {
    name: 'gmail_draft',
    description: 'Draft a Gmail reply (does NOT send, only creates draft)',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email'
        },
        subject: {
          type: 'string',
          description: 'Email subject'
        },
        body: {
          type: 'string',
          description: 'Email body (plain text or HTML)'
        },
        in_reply_to: {
          type: 'string',
          description: 'Optional: message ID to reply to'
        }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'calendar_check',
    description: 'Check Google Calendar for events in date range',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD)'
        },
        end_date: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD)'
        }
      },
      required: ['start_date', 'end_date']
    }
  },
  {
    name: 'calendar_suggest_time',
    description: 'Suggest available time slots based on calendar + preferences',
    input_schema: {
      type: 'object',
      properties: {
        duration_minutes: {
          type: 'number',
          description: 'Meeting duration in minutes'
        },
        between: {
          type: 'string',
          description: 'Date range (e.g. "next 7 days")'
        },
        preferences: {
          type: 'string',
          description: 'Time preferences (e.g. "mornings only", "avoid Fridays")'
        }
      },
      required: ['duration_minutes']
    }
  },
  {
    name: 'claude_code_fire',
    description: 'Fire a yolo build from PROMPT-QUEUE.md — opens terminal, pastes prompt, executes',
    input_schema: {
      type: 'object',
      properties: {
        prompt_name: {
          type: 'string',
          description: 'Name of prompt in PROMPT-QUEUE.md (e.g. "Atlas v3 dry-run")'
        }
      },
      required: ['prompt_name']
    }
  }
];

// ── Tool definitions — OpenAI/ElevenLabs format ──────────────────────────────
export const ROCKO_V2_TOOLS_OPENAI = ROCKO_V2_TOOLS_ANTHROPIC.map(tool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema
  }
}));
