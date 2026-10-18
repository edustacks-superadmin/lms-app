const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteProduct() {
    try {
        const deleted = await prisma.products.delete({
            where: { id: 6 }
        });
        console.log('Deleted product:', deleted.id);
    } catch (error) {
        console.error('Error deleting product:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteProduct();
