import { prisma } from '@/lib/prisma';
import { Story, CreateStoryInput } from '@/domain/story';
import { v4 as uuidv4 } from 'uuid';

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
    });
    
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in approveRequirementsInDB:', error);
    throw new Error('Failed to approve requirements in database');
  }
}

function mapPrismaToDomain(prismaStory: {
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
}): Story {
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
    },
    createdAt: prismaStory.createdAt,
    updatedAt: prismaStory.updatedAt,
  };
}