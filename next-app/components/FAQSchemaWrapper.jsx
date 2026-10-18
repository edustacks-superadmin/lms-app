'use client';

import React from 'react';
import { FAQSchema } from './StructuredData';

const FAQSchemaWrapper = ({ faqs }) => {
    return <FAQSchema faqs={faqs} />;
};

export default FAQSchemaWrapper;
