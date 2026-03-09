import { prisma } from '@/lib/prisma';
import { Story, StoryGateInfo, CreateStoryInput } from '@/domain/story';
import { GATES } from '@/domain/workflow-types';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

export async function createStoryInDB(input: CreateStoryInput): Promise<Story> {
  try {
    const story = await prisma.story.create({
      data: {
        id: uuidv4(),
        title: input.title,
        description: input.description,
        requirementsArtifactId: input.requirementsArtifactId,
        acceptanceCriteria: input.acceptanceCriteria || [],
        priority: input.priority || 'medium',
        status: 'draft',
        approvedRequirementsArtifact: false,
      },
      include: { gates: true },
    });
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in createStoryInDB:', error);
    throw new Error('Failed to create story in database');
  }
}

export async function getStoriesFromDB(): Promise<Story[]> {
  try {
    const stories = await prisma.story.findMany({
      orderBy: { createdAt: 'desc' },
      include: { gates: true },
    });
    return stories.map(mapPrismaToDomain);
  } catch (error) {
    console.error('Database error in getStoriesFromDB:', error);
    throw new Error('Failed to fetch stories from database');
  }
}

export async function getStoryByIdFromDB(id: string): Promise<Story | null> {
  try {
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        gates: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!story) return null;
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in getStoryByIdFromDB:', error);
    throw new Error('Failed to fetch story from database');
  }
}

export async function approveRequirementsInDB(
  storyId: string,
  approved: boolean
): Promise<Story | null> {
  try {
    const story = await prisma.story.update({
      where: { id: storyId },
      data: {
        approvedRequirementsArtifact: approved,
        status: approved ? 'approved' : 'draft',
      },
      include: { gates: true },
    });

    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in approveRequirementsInDB:', error);
    throw new Error('Failed to approve requirements in database');
  }
}

/**
 * Persist a gate completion to the database (Story 1 fix)
 */
export async function saveGateCompletion(data: {
  storyId: string;
  gate: string;
  status: string;
  evidence: unknown;
  completedBy: string;
  pickedUpAt?: Date;       // When gate was dispatched/picked up
  finalMessage?: string;  // Final agent output/summary
  artifacts?: unknown[];   // Screenshot URLs, links, metadata
}): Promise<void> {
  try {
    await prisma.storyGate.upsert({
      where: {
        storyId_gate: {
          storyId: data.storyId,
          gate: data.gate,
        },
      },
      update: {
        status: data.status,
        evidence: data.evidence as object ?? undefined,
        completedAt: data.status !== 'pending' ? new Date() : null,
        completedBy: data.completedBy,
        pickedUpAt: data.pickedUpAt ?? undefined,
        finalMessage: data.finalMessage ?? null,
        artifacts: data.artifacts as object ?? null,
      },
      create: {
        id: uuidv4(),
        storyId: data.storyId,
        gate: data.gate,
        status: data.status,
        evidence: data.evidence as object ?? undefined,
        completedAt: data.status !== 'pending' ? new Date() : null,
        completedBy: data.completedBy,
        pickedUpAt: data.pickedUpAt ?? undefined,
        finalMessage: data.finalMessage ?? null,
        artifacts: data.artifacts as object ?? null,
      },
    });
  } catch (error) {
    console.error('Database error in saveGateCompletion:', error);
    throw new Error('Failed to save gate completion');
  }
}

/**
 * Update a story's status (Story 2 fix)
 */
export async function updateStoryStatus(storyId: string, status: string): Promise<void> {
  try {
    await prisma.story.update({
      where: { id: storyId },
      data: { status },
    });
  } catch (error) {
    console.error('Database error in updateStoryStatus:', error);
    throw new Error('Failed to update story status');
  }
}

// Type for Prisma story with optional gates relation
interface PrismaStoryWithGates {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  requirementsArtifactId: string | null;
  approvedRequirementsArtifact: boolean;
  acceptanceCriteria: string[];
  createdAt: Date;
  updatedAt: Date;
  gates?: Array<{
    id: string;
    gate: string;
    status: string;
    completedAt: Date | null;
    completedBy: string | null;
    pickedUpAt: Date | null;         // When gate was dispatched/picked up
    finalMessage: string | null;     // Final agent output/summary
    artifacts: Prisma.JsonValue;     // Screenshot URLs, links, metadata
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    googleDriveUrl: string;
    description: string | null;
    createdAt: Date;
  }>;
}

/**
 * Compute the current gate based on completed gates (Story 3 fix)
 * Returns the next gate after the last approved one, or the first gate if none approved.
 */
function computeCurrentGate(gates: StoryGateInfo[], storyStatus: string): string | null {
  if (storyStatus === 'completed' || storyStatus === 'draft' || storyStatus === 'archived') {
    return null;
  }

  // Find the furthest approved gate in pipeline order
  const gateOrder = GATES as readonly string[];
  let lastApprovedIndex = -1;

  for (const gateInfo of gates) {
    if (gateInfo.status === 'approved') {
      const idx = gateOrder.indexOf(gateInfo.gate);
      if (idx > lastApprovedIndex) {
        lastApprovedIndex = idx;
      }
    }
  }

  // Next gate after last approved, or first gate if none approved yet
  const nextIndex = lastApprovedIndex + 1;
  if (nextIndex >= gateOrder.length) {
    return null; // All gates completed
  }

  return gateOrder[nextIndex];
}

function mapPrismaToDomain(prismaStory: PrismaStoryWithGates): Story {
  const gateInfos: StoryGateInfo[] = (prismaStory.gates || []).map((g) => ({
    gate: g.gate,
    status: g.status,
    pickedUpAt: g.pickedUpAt,
    completedAt: g.completedAt,
    completedBy: g.completedBy,
    finalMessage: g.finalMessage || undefined,
    artifacts: (g.artifacts as unknown as StoryGateInfo['artifacts']) || undefined,
  }));

  // Map attachments to StoryAttachmentRef format
  const attachmentRefs = (prismaStory.attachments || []).map((a) => ({
    id: a.id,
    filename: a.filename,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    googleDriveUrl: a.googleDriveUrl,
    description: a.description || undefined,
  }));

  return {
    id: prismaStory.id,
    status: prismaStory.status as Story['status'],
    metadata: {
      title: prismaStory.title,
      description: prismaStory.description || '',
      requirementsArtifactId: prismaStory.requirementsArtifactId || undefined,
      approvedRequirementsArtifact: prismaStory.approvedRequirementsArtifact,
      acceptanceCriteria: prismaStory.acceptanceCriteria,
      priority: (prismaStory.priority as Story['metadata']['priority']) || 'medium',
      attachments: attachmentRefs.length > 0 ? attachmentRefs : undefined,
    },
    gates: gateInfos,
    currentGate: computeCurrentGate(gateInfos, prismaStory.status),
    createdAt: prismaStory.createdAt,
    updatedAt: prismaStory.updatedAt,
  };
}
