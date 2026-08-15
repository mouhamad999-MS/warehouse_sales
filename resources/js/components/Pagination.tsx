import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    const { t } = useTranslation();

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('page')} {page} {t('of')} {totalPages}
            </p>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                >
                    {t('previous')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                >
                    {t('next')}
                </Button>
            </div>
        </div>
    );
}
