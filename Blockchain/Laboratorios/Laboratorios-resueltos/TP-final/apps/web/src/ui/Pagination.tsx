import { Button } from "./Button";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Paginación">
      <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <span>
        Página {page} de {pageCount}
      </span>
      <Button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </Button>
    </nav>
  );
}
