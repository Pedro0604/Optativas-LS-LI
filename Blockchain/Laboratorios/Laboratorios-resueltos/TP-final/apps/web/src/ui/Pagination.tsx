import { Button } from "./Button";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  return (
    <nav
      className="my-6 grid grid-cols-2 items-center gap-3 text-xs sm:flex sm:justify-between sm:gap-4 sm:text-sm"
      aria-label="Paginación"
    >
      <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <span className="col-span-2 row-start-1 text-center sm:col-auto sm:row-auto">
        Página {page} de {pageCount}
      </span>
      <Button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </Button>
    </nav>
  );
}
