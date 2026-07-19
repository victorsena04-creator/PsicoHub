export default function ProtectedLoading() {
  return (
    <div className="w-full p-6 md:p-8 animate-pulse space-y-6">
      {/* Cabeçalho Placeholder */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-outline-variant/50">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-surface-container-high rounded-md"></div>
          <div className="h-4 w-80 bg-surface-container-low rounded-md"></div>
        </div>
        <div className="h-9 w-36 bg-surface-container-high rounded-md"></div>
      </div>

      {/* Grid de Cards Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-32 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 space-y-3">
          <div className="h-4 w-32 bg-surface-container-high rounded"></div>
          <div className="h-8 w-24 bg-surface-container-high rounded"></div>
        </div>
        <div className="h-32 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 space-y-3">
          <div className="h-4 w-32 bg-surface-container-high rounded"></div>
          <div className="h-8 w-24 bg-surface-container-high rounded"></div>
        </div>
        <div className="h-32 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 space-y-3">
          <div className="h-4 w-32 bg-surface-container-high rounded"></div>
          <div className="h-8 w-24 bg-surface-container-high rounded"></div>
        </div>
      </div>

      {/* Área Principal de Tabela / Conteúdo Placeholder */}
      <div className="h-64 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-6 space-y-4">
        <div className="h-5 w-40 bg-surface-container-high rounded"></div>
        <div className="space-y-3 pt-2">
          <div className="h-10 w-full bg-surface-container-low rounded-lg"></div>
          <div className="h-10 w-full bg-surface-container-low rounded-lg"></div>
          <div className="h-10 w-full bg-surface-container-low rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
