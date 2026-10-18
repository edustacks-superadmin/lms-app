'use server';

export async function debugGetBatches() {
    console.log("Debug Action Called");
    return {
        success: true,
        data: [{ id: 1, name: "DEBUG BATCH FROM NEW FILE", institute_id: "10" }]
    };
}
