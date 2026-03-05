import { ref, computed } from 'vue'
import type { Database } from '~/types/supabase' // Note: This will fallback to any if no full typed DB, we use custom type below
import type { ProdutoRuptura } from '~/types/supabase'

export function useRupturas() {
    const supabase = useSupabaseClient()

    const produtos = ref<ProdutoRuptura[]>([])
    const pending = ref(false)
    const error = ref<Error | null>(null)

    const stats = computed(() => {
        let ambas = 0
        let parcial = 0
        let total = produtos.value.length

        produtos.value.forEach(p => {
            const isAssuZero = (p.saldo_assu || 0) <= 0
            const isMossoroZero = (p.saldo_mossoro || 0) <= 0

            if (isAssuZero && isMossoroZero) {
                ambas++
            } else if (isAssuZero || isMossoroZero) {
                parcial++
            }
        })

        return {
            total,
            ambas,
            parcial
        }
    })

    async function fetchData() {
        pending.value = true
        error.value = null

        try {
            // Retornar limit 1000 por garantia inicial, ordenando pelo nome
            const { data, error: sbError } = await supabase
                .from('produtos_ruptura')
                .select('*')
                .order('nome_produto', { ascending: true })
                .limit(1000)

            if (sbError) throw sbError

            produtos.value = (data as ProdutoRuptura[]) || []
        } catch (err: any) {
            console.error('Error fetching rupturas:', err)
            error.value = err
        } finally {
            pending.value = false
        }
    }

    // Auto-fetch in component setup context
    useAsyncData('rupturas-dashboard', async () => {
        await fetchData()
        return true
    })

    return {
        produtos,
        stats,
        pending,
        error,
        fetchData
    }
}
