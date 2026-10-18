'use client';

import { AuthProvider } from '../context/AuthContext';
import { UserProvider } from '../context/UserContext';
import { BatchProvider } from '../context/BatchContext';
import { CourseProvider } from '../context/CourseContext';
import { PostProvider } from '../context/PostContext';
import { CategoryProvider } from '../context/CategoryContext';
import { ProductProvider } from '../context/ProductContext';
import { ProductCategoryProvider } from '../context/ProductCategoryContext';
import { SubjectProvider } from '../context/SubjectContext';
import { QuestionProvider } from '../context/QuestionContext';
import { QuestionFolderProvider } from '../context/QuestionFolderContext';
import { ExamProvider } from '../context/ExamContext';
import { ChapterProvider } from '../context/ChapterContext';
import { InstituteProvider } from '../context/InstituteContext';
import { HomeSettingsProvider } from '../context/HomeSettingsContext';
import { CustomFieldsProvider } from '../context/CustomFieldsContext';
import { TagProvider } from '../context/TagContext';
import { ToastProvider } from '../context/ToastContext';
import { TransactionProvider } from '../context/TransactionContext';
import { OfferProvider } from '../context/OfferContext';
import { SidebarProvider } from '../context/SidebarContext';
import { FeatureFlagsProvider } from '../context/FeatureFlagsContext';
import { CartProvider } from '../context/CartContext';

export function Providers({ children, initialInstitute }) {
    return (
        <AuthProvider>
            <InstituteProvider initialInstitute={initialInstitute}>
                <FeatureFlagsProvider>
                    <UserProvider>
                        <BatchProvider>
                            <CourseProvider>
                                <PostProvider>
                                    <CategoryProvider>
                                        <ProductProvider>
                                            <ProductCategoryProvider>
                                                <SubjectProvider>
                                                    <QuestionProvider>
                                                        <QuestionFolderProvider>
                                                            <ExamProvider>
                                                                <ChapterProvider>
                                                                    <HomeSettingsProvider>
                                                                        <CustomFieldsProvider>
                                                                            <TagProvider>
                                                                                <ToastProvider>
                                                                                    <TransactionProvider>
                                                                                        <OfferProvider>
                                                                                            <CartProvider>
                                                                                                <SidebarProvider>
                                                                                                    {children}
                                                                                                </SidebarProvider>
                                                                                            </CartProvider>
                                                                                        </OfferProvider>
                                                                                    </TransactionProvider>
                                                                                </ToastProvider>
                                                                            </TagProvider>
                                                                        </CustomFieldsProvider>
                                                                    </HomeSettingsProvider>
                                                                </ChapterProvider>
                                                            </ExamProvider>
                                                        </QuestionFolderProvider>
                                                    </QuestionProvider>
                                                </SubjectProvider>
                                            </ProductCategoryProvider>
                                        </ProductProvider>
                                    </CategoryProvider>
                                </PostProvider>
                            </CourseProvider>
                        </BatchProvider>
                    </UserProvider>
                </FeatureFlagsProvider>
            </InstituteProvider>
        </AuthProvider>
    );
}
