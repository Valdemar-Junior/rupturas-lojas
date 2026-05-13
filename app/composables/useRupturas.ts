import { ref, computed, onMounted } from 'vue'
import type { DashboardStats, ProdutoEstoque, ProdutoRuptura } from '~/types/supabase'

type NumericLike = number | string | null | undefined

function toNumber(value: NumericLike): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() !== '') return Number(value)
    return 0
}

export function useRupturas() {
    const supabase = useSupabaseClient()

    const rupturas = ref<ProdutoRuptura[]>([])
    const rupturaDeposito = ref<ProdutoEstoque[]>([])
    const pending = ref(false)
    const error = ref<Error | null>(null)
    const updatedAt = ref<string | null>(null)

    const stats = computed<DashboardStats>(() => {
        let todas = 0
        let assu = 0
        let mossoro = 0
        let mossoroPartage = 0

        rupturas.value.forEach((p) => {
            const isAssuZero = toNumber(p.saldo_assu) <= 0
            const isMossoroZero = toNumber(p.saldo_mossoro) <= 0
            const isMossoroPartageZero = toNumber(p.saldo_mossoro_partage) <= 0

            if (isAssuZero && isMossoroZero && isMossoroPartageZero) todas++
            if (isAssuZero) assu++
            if (isMossoroZero) mossoro++
            if (isMossoroPartageZero) mossoroPartage++
        })

        let rupturaDepositoAssu = 0
        let rupturaDepositoMossoro = 0
        let rupturaDepositoMossoroPartage = 0

        rupturaDeposito.value.forEach((p) => {
            const assuSaldo = toNumber(p.saldo_assu)
            const mossoroSaldo = toNumber(p.saldo_mossoro)
            const mossoroPartageSaldo = toNumber(p.saldo_mossoro_partage)

            if (assuSaldo > 0) rupturaDepositoAssu++
            if (mossoroSaldo > 0) rupturaDepositoMossoro++
            if (mossoroPartageSaldo > 0) rupturaDepositoMossoroPartage++
        })

        return {
            ruptura: {
                total: rupturas.value.length,
                todas,
                assu,
                mossoro,
                mossoroPartage
            },
            rupturaDeposito: {
                total: rupturaDeposito.value.length,
                assu: rupturaDepositoAssu,
                mossoro: rupturaDepositoMossoro,
                mossoroPartage: rupturaDepositoMossoroPartage
            },
            criticos: todas + rupturaDeposito.value.length
        }
    })

    async function fetchData() {
        pending.value = true
        error.value = null

        try {
            const [rupturasResult, estoqueResult] = await Promise.all([
                supabase
                    .from('produtos_ruptura')
                    .select('*')
                    .order('nome_produto', { ascending: true })
                    .limit(2000),
                supabase
                    .from('produtos_estoque')
                    .select('*')
                    .order('nome_produto', { ascending: true })
                    .limit(2000)
            ])

            if (rupturasResult.error) throw rupturasResult.error
            if (estoqueResult.error) throw estoqueResult.error

            rupturas.value = (rupturasResult.data as ProdutoRuptura[]) || []

            const estoqueRaw = (estoqueResult.data as ProdutoEstoque[]) || []

            rupturaDeposito.value = estoqueRaw.filter((item) => {
                const deposito = toNumber(item.saldo_deposito)
                const assuSaldo = toNumber(item.saldo_assu)
                const mossoroSaldo = toNumber(item.saldo_mossoro)
                const mossoroPartageSaldo = toNumber(item.saldo_mossoro_partage)

                return deposito <= 0 && (assuSaldo > 0 || mossoroSaldo > 0 || mossoroPartageSaldo > 0)
            })

            updatedAt.value = new Date().toISOString()
        } catch (err: any) {
            console.error('Error fetching dashboard data:', err)
            error.value = err
        } finally {
            pending.value = false
        }
    }

    // Auto-fetch on client side mount
    onMounted(() => {
        void fetchData()
    })

    return {
        rupturas,
        rupturaDeposito,
        stats,
        pending,
        error,
        updatedAt,
        fetchData
    }
}
