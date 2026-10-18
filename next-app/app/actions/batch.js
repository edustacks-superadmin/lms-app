'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Manually map batch object to plain JSON, ensuring safe types.
 */
function mapBatch(batch) {
    const plain = {
        id: Number(batch.id),
        name: String(batch.name || ''),
        created_at: batch.created_at ? new Date(batch.created_at).toISOString() : null,
        url: batch.url ? String(batch.url) : null,
        modified: batch.modified ? new Date(batch.modified).toISOString() : null,
        is_local: Boolean(batch.is_local),
        institute_id: batch.institute_id ? batch.institute_id.toString() : null,
        // Map _count if it exists
        ...(batch._count && {
            _count: {
                batch_members: Number(batch._count.batch_members || 0),
                batch_courses: Number(batch._count.batch_courses || 0)
            }
        })
    };
    // Double safety: remove any prototype chains
    return JSON.parse(JSON.stringify(plain));
}

/**
 * Fetch all batches with their member and course counts.
 */
/**
 * Fetch batches with pagination and search.
 * @param {Object} params - { page, limit, search }
 */
export async function getBatches({ page = 1, limit = 10, search = '', instituteId = null } = {}) {
    try {
        const skip = (page - 1) * limit;
        const take = limit;

        // Build where clause for search and institute
        const where = {
            ...(instituteId && { institute_id: parseInt(instituteId) }), // Filter by institute
            ...(search && {
                name: {
                    contains: search,
                    mode: 'insensitive', // Case-insensitive search
                }
            })
        };

        // Run count and findMany in transaction for consistency (or parallel)
        const [total, batches] = await prisma.$transaction([
            prisma.batches.count({ where }),
            prisma.batches.findMany({
                where,
                skip,
                take,
                orderBy: {
                    created_at: 'desc',
                },
                include: {
                    _count: {
                        select: {
                            batch_members: true,
                            batch_courses: true,
                        },
                    },
                },
            }),
        ]);

        const safeBatches = batches.map(mapBatch);

        return {
            success: true,
            data: {
                batches: safeBatches,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    current: page,
                    limit
                }
            }
        };
    } catch (error) {
        console.error('Error fetching batches:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Create a new batch.
 */
export async function createBatch(data) {
    try {
        const newBatch = await prisma.batches.create({
            data: {
                name: data.name,
                // Default values as per schema if not provided
                is_local: true,
                created_at: new Date(),
                institute_id: data.institute_id ? parseInt(data.institute_id) : 10, // Default to 10 if missing, but should be passed
            },
        });

        revalidatePath('/batches');
        return { success: true, data: mapBatch(newBatch) };
    } catch (error) {
        console.error('Error creating batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing batch.
 */
export async function updateBatch(id, data) {
    try {
        const updatedBatch = await prisma.batches.update({
            where: { id: parseInt(id) },
            data: {
                name: data.name,
                modified: new Date(),
            },
        });

        revalidatePath('/batches');
        return { success: true, data: mapBatch(updatedBatch) };
    } catch (error) {
        console.error('Error updating batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a batch.
 */
export async function deleteBatch(id) {
    try {
        const batchId = parseInt(id);

        // Use transaction to ensure all related records are deleted before the batch
        await prisma.$transaction([
            // 1. Delete batch_members associations
            prisma.batch_members.deleteMany({
                where: { batch_id: batchId }
            }),
            // 2. Delete batch_courses associations
            prisma.batch_courses.deleteMany({
                where: { batch_id: batchId }
            }),
            // 3. Finally delete the batch
            prisma.batches.delete({
                where: { id: batchId },
            })
        ]);

        revalidatePath('/batches');
        return { success: true };
    } catch (error) {
        console.error('Error deleting batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clone a batch (including its member associations).
 */
export async function cloneBatch(id) {
    try {
        // 1. Fetch original batch with relations
        const originalBatch = await prisma.batches.findUnique({
            where: { id: parseInt(id) },
            include: {
                batch_courses: true,
                batch_members: true,
            },
        });

        if (!originalBatch) {
            throw new Error('Batch not found');
        }

        // 2. Create new batch
        const newBatch = await prisma.batches.create({
            data: {
                name: `${originalBatch.name} (Copy)`,
                created_at: new Date(),
                // 3. Clone relations in the same transaction
                batch_courses: {
                    create: originalBatch.batch_courses.map(bc => ({
                        course_id: bc.course_id,
                        institute_id: bc.institute_id
                    }))
                },
                batch_members: {
                    create: originalBatch.batch_members.map(bm => ({
                        member_id: bm.member_id,
                        institute_id: bm.institute_id
                    }))
                }
            },
        });

        revalidatePath('/batches');
        return { success: true, data: mapBatch(newBatch) };
    } catch (error) {
        console.error('Error cloning batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add members to a batch
 */
export async function addMembersToBatch(batchId, memberIds, expiryDate = null, instituteId = null) {
    try {
        const parsedBatchId = parseInt(batchId);
        const parsedMemberIds = memberIds.map(id => parseInt(id));
        const parsedInstituteId = instituteId ? parseInt(instituteId) : 10;

        // 1. Fetch info for members to get auth_user_id
        const members = await prisma.members.findMany({
            where: { id: { in: parsedMemberIds } },
            select: { id: true, auth_user_id: true }
        });

        // 2. Prepare data for batch_members
        const batchMemberData = parsedMemberIds.map(memberId => ({
            batch_id: parsedBatchId,
            member_id: memberId,
            institute_id: parsedInstituteId
        }));

        // 3. Prepare data for subscriptions
        // Create subscriptions for each member found
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const subscriptionData = members.map(m => ({
            member_id: m.id,
            user_id: (m.auth_user_id && uuidRegex.test(m.auth_user_id)) ? m.auth_user_id : null,
            batch_id: parsedBatchId,
            expires_on: expiryDate ? new Date(expiryDate) : null,
            status: 'Active',
            created_at: new Date(),
            institute_id: parsedInstituteId
        }));

        // Execute in transaction
        await prisma.$transaction([
            prisma.batch_members.createMany({
                data: batchMemberData,
                skipDuplicates: true // Ignore if already in batch_members
            }),
            prisma.subscriptions.createMany({
                data: subscriptionData,
                skipDuplicates: true // Ignore if subscription already exists (logic might need refinement for updates, but safe for adding)
            })
        ]);

        revalidatePath('/batches');
        return { success: true };
    } catch (error) {
        console.error('Error adding members to batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove members from a batch
 */
export async function removeMembersFromBatch(batchId, memberIds) {
    try {
        await prisma.batch_members.deleteMany({
            where: {
                batch_id: parseInt(batchId),
                member_id: {
                    in: memberIds.map(id => parseInt(id))
                }
            }
        });

        revalidatePath('/batches');
        return { success: true };
    } catch (error) {
        console.error('Error removing members from batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Force logout for all members in a batch.
 */
export async function forceLogoutBatchMembers(batchId) {
    try {
        // 1. Get all member IDs in this batch
        const batchMembers = await prisma.batch_members.findMany({
            where: { batch_id: parseInt(batchId) },
            select: { member_id: true }
        });

        const memberIds = batchMembers.map(bm => bm.member_id);

        if (memberIds.length === 0) {
            return { success: true, message: 'No members in batch' };
        }

        // 2. Clear sessions in auth schema
        const members = await prisma.members.findMany({
            where: {
                id: { in: memberIds },
                auth_user_id: { not: null }
            },
            select: { auth_user_id: true }
        });

        const authUserIds = members.map(m => m.auth_user_id);

        if (authUserIds.length > 0) {
            await prisma.sessions.deleteMany({
                where: {
                    user_id: { in: authUserIds }
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error forcing logout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all members belonging to a batch
 */
export async function getBatchMembersAction(batchId) {
    try {
        const parsedBatchId = parseInt(batchId);

        // Fetch batch_members with the related member data
        const batchMembers = await prisma.batch_members.findMany({
            where: { batch_id: parsedBatchId },
            include: {
                members: {
                    select: {
                        id: true,
                        display_name: true,
                        email: true,
                        phone_number: true,
                        status: true,
                        photo_url: true,
                        created_at: true
                    }
                }
            }
        });

        // Map to the expected format
        const members = batchMembers.map(bm => ({
            id: bm.members.id,
            display_name: bm.members.display_name,
            email: bm.members.email,
            phone_number: bm.members.phone_number,
            status: bm.members.status,
            photo_url: bm.members.photo_url,
            joined_at: bm.created_at ? new Date(bm.created_at).toISOString() : null
        }));

        return { success: true, data: members };
    } catch (error) {
        console.error('Error fetching batch members:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all courses belonging to a batch
 */
export async function getBatchCoursesAction(batchId) {
    try {
        const parsedBatchId = parseInt(batchId);

        // Fetch batch_courses with the related course data
        const batchCourses = await prisma.batch_courses.findMany({
            where: { batch_id: parsedBatchId },
            include: {
                courses: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        image_url: true,
                        created_at: true
                    }
                }
            }
        });

        // Map to the expected format
        const courses = batchCourses.map(bc => ({
            id: bc.courses.id,
            title: bc.courses.title,
            name: bc.courses.title,
            description: bc.courses.description,
            image_url: bc.courses.image_url,
            assigned_at: bc.created_at ? new Date(bc.created_at).toISOString() : null
        }));

        return { success: true, data: courses };
    } catch (error) {
        console.error('Error fetching batch courses:', error);
        return { success: false, error: error.message };
    }
}
