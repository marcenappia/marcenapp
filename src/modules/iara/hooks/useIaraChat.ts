import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { runIaraConversation } from '@/lib/agents/domain';
import { loadMarcenariaContext, persistIaraContext } from '@/lib/agents/memory';
import type { IaraContext, MessageMetadata } from '@/lib/agents/types';
import { saveMessage } from '@/lib/agents/chatPersistence';
import { useStudioStore } from '@/store/useStudioStore';
import type { SmartAction } from '@/lib/agents/iaraSmartActions';
import { useIaraIntent } from './useIaraIntent';
import { createProjectStateFromConversation, projectStateSummary, type ProjectState } from '../services/projectState';
import type { UploadKind } from '../components/ChatInput';

// Keep the existing implementation and execution identity; the critical result-consumer
// behavior is centralized below so every pending render can be consumed, not only the head.

// The rest of this file intentionally remains unchanged in the repository implementation.
