import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tag, GripVertical, Package } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import OffersList from './OffersList';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const ProductCard = ({ product, dragHandleProps, isDragging }) => {
    const navigate = useNavigate();

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', background: 'var(--white)', position: 'relative', cursor: 'pointer', opacity: isDragging ? 0.5 : 1, width: '256px', margin: '0 auto' }}>
            {/* Drag Handle - only show if props provided */}
            {dragHandleProps && (
                <div
                    {...dragHandleProps}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        background: 'rgba(255,255,255,0.5)',
                        borderBottomRightRadius: '4px',
                        padding: '6px',
                        cursor: 'grab',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <GripVertical size={18} color="#333" />
                </div>
            )}

            {/* Inactive Badge */}
            {product.is_active === false && (
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    Inactive
                </div>
            )}

            {/* Card Image Area */}
            <div
                onClick={() => navigate(`/store/product/${product.id}`)}
                style={{
                    width: '256px',
                    height: '144px',
                    backgroundColor: product.image ? '#f5f5f5' : '#0055aa',
                    color: product.image ? '#333' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '10px',
                    position: 'relative',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    margin: '0 auto'
                }}>
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.title}
                        style={{
                            width: '256px',
                            height: '144px',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '100%' }}>
                        <Package size={48} color="#fff" />
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                            {product.title}
                        </div>
                    </div>
                )}
            </div>

            {/* Card Content */}
            <div
                onClick={() => navigate(`/store/product/${product.id}`)}
                style={{ padding: '12px 0' }}
            >
                <h3 style={{ fontSize: '14px', fontWeight: '400', color: 'var(--primary-color)', textAlign: 'center' }}>
                    {product.title}
                </h3>
                {product.price && (
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#333', textAlign: 'center', marginTop: '8px' }}>
                        ₹{product.price}
                    </p>
                )}
            </div>
        </div>
    );
};

const SortableProduct = ({ product }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ProductCard
                product={product}
                dragHandleProps={{ ...attributes, ...listeners }}
                isDragging={isDragging}
            />
        </div>
    );
};

const ProductList = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const categoryFilter = searchParams.get('category');
    const statusFilter = searchParams.get('status') || 'approved'; // Default to approved
    const { products, fetchProducts, updateProductOrder, loading } = useProducts();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = products.findIndex((p) => p.id === active.id);
            const newIndex = products.findIndex((p) => p.id === over.id);

            const reorderedProducts = arrayMove(products, oldIndex, newIndex);

            // Update in backend
            await updateProductOrder(reorderedProducts);
        }
    };

    // If status is 'offer', render OffersList instead
    if (statusFilter === 'offer') {
        return <OffersList />;
    }

    // Apply both category and status filters
    const filteredProducts = products.filter(product => {
        // Category filter
        if (categoryFilter && product.category_id !== categoryFilter) {
            return false;
        }

        // Status filter
        const isInactive = product.is_active === false || product.status === 'inactive';
        const productStatus = isInactive ? 'inactive' : (product.status || 'approved');
        if (productStatus !== statusFilter) {
            return false;
        }

        return true;
    });

    const getStatusLabel = () => {
        const statusLabels = {
            draft: 'Drafts',
            pending: 'Pending Approval',
            approved: 'Approved Products',
            inactive: 'Inactive Products',
            offer: 'Products on Offer'
        };
        return statusLabels[statusFilter] || 'Products';
    };

    return (
        <div style={{ flex: 1 }}>
            {/* Top Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '400' }}>
                    {getStatusLabel()}
                </h2>
                <button
                    onClick={() => navigate('/store/categories')}
                    className="btn btn-outline"
                    style={{ background: '#f5f5f5', border: '1px solid #ddd', color: '#333' }}
                >
                    <Tag size={16} /> Categories
                </button>
            </div>

            {loading && <p>Loading products...</p>}

            {/* Product Grid */}
            {/* Only enable Drag and Drop if NO category is selected AND status is 'approved' */}
            {!categoryFilter && statusFilter === 'approved' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredProducts.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                            {filteredProducts.map((product) => (
                                <SortableProduct key={product.id} product={product} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}

            {!loading && filteredProducts.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                    {categoryFilter ? 'No products found in this category.' : 'No products found. Create your first product!'}
                </p>
            )}
        </div>
    );
};

export default ProductList;
