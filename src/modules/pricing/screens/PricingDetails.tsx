import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '../../../components/input/Input';
import Select from '../../../components/select/Select';
import useProductRequests from '../../product/hooks/useProductRequests';
import { IProduct } from '../../product/interfaces/ProductInterface';
import useProductVariationRequests from '../../product/product-variation/hooks/useProductVariationRequests';
import {
    IProductVariation
} from '../../product/product-variation/interfaces/ProductVariationInterface';
import usePricingRequests from '../hooks/usePricingRequests';
import { IPricing } from '../interfaces/PricingInterface';
import useSalePlatformCommissionRequests from '../sale-platform-commission/hooks/useSalePlatformCommissionRequests';
import {
    ISalePlatformCommission
} from '../sale-platform-commission/interfaces/SalePlatformCommissionInterface';

const schema = z.object({
  product: z.string().min(1, 'Selecione um produto'),
  productVariation: z
    .string({
      // eslint-disable-next-line camelcase
      required_error: 'Selecione uma variação',
      // eslint-disable-next-line camelcase
      invalid_type_error: 'Selecione uma variação',
    })
    .min(1, 'Selecione uma variação'),
  salePlatform: z.string().min(1, 'Selecione uma plataforma'),
  costPrice: z.preprocess(
    (value) => Number(value),
    z
      .number({ message: 'O campo preço de custo deve ser um número' })
      .positive({
        message: 'O campo preço de custo deve ser um número positivo',
      }),
  ),
  salePrice: z.preprocess(
    (value) => Number(value),
    z
      .number({ message: 'O campo preço de venda deve ser um número' })
      .positive({
        message: 'O campo preço de venda deve ser um número positivo',
      }),
  ),
});

type FormData = z.infer<typeof schema>;

interface PricingDetailsProps {
  onCancel?: () => void;
  pricingId?: number;
  onSave?: () => void;
}

export const PricingDetails = ({
  onCancel,
  pricingId,
  onSave,
}: PricingDetailsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { getPricingById, savePricing } = usePricingRequests();
  const [pricing, setPricing] = useState<IPricing>();

  const [products, setProducts] = useState<IProduct[]>([]);
  const { getProducts } = useProductRequests();

  const [productVariations, setProductVariations] = useState<
    IProductVariation[]
  >([]);
  const { getProductVariations } = useProductVariationRequests();

  const [salePlatformCommissions, setSalePlatformCommissions] = useState<
    ISalePlatformCommission[]
  >([]);
  const [salePlatformCommission, setSalePlatformCommission] =
    useState<ISalePlatformCommission>();
  const { getSalePlatformCommissions, getSalePlatformCommissionByPlatformId } =
    useSalePlatformCommissionRequests();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const memoizedGetProducts = useCallback(getProducts, [getProducts]);

  const memoizedGetSalePlatformCommissionByPlatformId = useCallback(
    getSalePlatformCommissionByPlatformId,
    [getSalePlatformCommissionByPlatformId],
  );

  const loadPricing = useCallback(async () => {
    if (pricingId) {
      await getPricingById(pricingId).then((data: IPricing | undefined) => {
        if (data) {
          setPricing(data);
          setValue('product', data.product.id.toString());
          setValue(
            'productVariation',
            data.productVariation.id?.toString() || '',
          );
          setValue('salePlatform', data?.salePlatform?.id?.toString());
          setValue('costPrice', data.costPrice);
          setValue('salePrice', data.salePrice);
        }
      });
    }
  }, [getPricingById, pricingId, setValue]);

  // Segundo useEffect para carregar os produtos
  useEffect(() => {
    const loadProducts = async () => {
      const productsData = await memoizedGetProducts();
      setProducts(productsData);
    };

    if (products.length === 0) {
      loadProducts();
    }
  }, [memoizedGetProducts, products.length]);

  // Terceiro useEffect para carregar os dados de precificação
  useEffect(() => {
    if (pricingId && !pricing) {
      const loadPricingData = async () => {
        const pricingData: IPricing | undefined =
          await getPricingById(pricingId);

        if (pricingData) {
          setPricing(pricingData);
          setValue('product', pricingData.product.id.toString());
          setValue(
            'productVariation',
            pricingData.productVariation.id?.toString() || '',
          );
          setValue('salePlatform', pricingData?.salePlatform?.id?.toString());
          setValue('costPrice', pricingData.costPrice);
          setValue('salePrice', pricingData.salePrice);
        }
      };

      setIsLoading(true);
      loadPricingData();
      setIsLoading(false);
    }
  }, [getPricingById, loadPricing, pricing, pricingId, setValue]);

  const { product, productVariation, salePlatform, costPrice } = watch();

  const isAllFieldsFilled =
    product && productVariation && salePlatform && costPrice;

  const salePlatformId = parseInt(watch('salePlatform'));

  useEffect(() => {
    if (salePlatformCommissions.length === 0 && !salePlatformId) {
      const loadSalePlatforms = async () => {
        const salePlatformsData = await getSalePlatformCommissions();
        setSalePlatformCommissions(salePlatformsData);
      };

      loadSalePlatforms();
    }
  }, [
    getSalePlatformCommissions,
    salePlatformCommissions.length,
    salePlatformId,
  ]);

  useEffect(() => {
    if (salePlatformId) {
      const loadSalePlatformCommission = async () => {
        if (salePlatformId) {
          const data =
            await memoizedGetSalePlatformCommissionByPlatformId(salePlatformId);
          if (data) {
            setSalePlatformCommission(data);
          }
        } else {
          setSalePlatformCommission(undefined);
        }
      };

      loadSalePlatformCommission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePlatformId]);

  const calculatedSalePrice = useMemo(() => {
    if (!salePlatformCommission || !isAllFieldsFilled) return 0;

    const additionalProfit = Number(
      salePlatformCommission.additionalProfit || 0,
    );
    const costPerItemSold = Number(salePlatformCommission.costPerItemSold || 0);
    const defaultProfitPercentage = Number(
      salePlatformCommission.defaultProfitPercentage || 0,
    );
    const commissionPercentage = Number(
      salePlatformCommission.commissionPercentage || 0,
    );

    const costs = costPrice + additionalProfit + costPerItemSold;
    const profitPercentage =
      (100 - (defaultProfitPercentage + commissionPercentage)) / 100;

    return Number((costs / profitPercentage).toFixed(2));
  }, [salePlatformCommission, isAllFieldsFilled, costPrice]);

  // Adicione um useEffect único para atualizar o preço de venda
  useEffect(() => {
    if (isAllFieldsFilled && salePlatformCommission) {
      setIsLoading(true);
      setValue('salePrice', calculatedSalePrice);
      setIsLoading(false);
    }
  }, [
    calculatedSalePrice,
    isAllFieldsFilled,
    salePlatformCommission,
    setValue,
  ]);

  const productId = watch('product');
  const productVariationId = watch('productVariation');

  // Then modify the useEffect for product variations like this:
  useEffect(() => {
    const loadProductVariations = async () => {
      if (productId && productId !== '') {
        const response = await getProductVariations(parseInt(productId));
        setProductVariations(response);
      }
    };

    loadProductVariations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]); // Remove memoizedGetProductVariations from dependencies

  function onSubmit(data: FormData) {
    savePricing(
      {
        productId: parseInt(productId),
        productVariationId: parseInt(productVariationId),
        salePlatformId: parseInt(data.salePlatform),
        costPrice: data.costPrice,
        salePrice: data.salePrice,
      },
      pricing?.id.toString(),
    )
      .then((response) => {
        if (response) {
          onSave?.();
          handleCancel();
          toast.success('Comissão salva com sucesso!');
          reset();
        } else {
          toast.error('Erro ao salvar a comissão');
        }
      })
      .catch((error) => {
        throw new Error(`Erro ao salvar a comissão: ${error}`);
      });
  }

  const handleCancel = () => {
    setPricing(undefined);
    setProducts([]);
    setProductVariations([]);
    setSalePlatformCommissions([]);
    reset();
    onCancel?.();
  };

  return (
    <div>
      {isLoading ? (
        <div className='w-full flex justify-center items-center'>
          <div>Carregando...</div>;
        </div>
      ) : (
        <div className='w-full bg-white p-3 rounded-lg flex flex-col sm:flex-row items-center gap-2 mt-2'>
          <form className='w-full' onSubmit={handleSubmit(onSubmit)}>
            <div className='w-full mb-4'>
              <Select
                className='w-full border-2 rounded-md mb-4 px-2'
                title='Produto'
                name='product'
                options={products.map((product) => ({
                  value: product.id ? product.id.toString() : '',
                  label: product.name,
                }))}
                register={register}
              />
              {errors.product && (
                <p className='my-1 text-red-500'>{errors.product.message}</p>
              )}
            </div>
            {productId && productVariations.length > 0 && (
              <div className='w-full mb-4'>
                <Select
                  className='w-full border-2 rounded-md mb-4 px-2'
                  title='Variação'
                  name='productVariation'
                  options={productVariations.map((productVariation) => ({
                    value: productVariation.id
                      ? productVariation.id.toString()
                      : '',
                    label: productVariation.name,
                  }))}
                  register={register}
                />
                {errors.productVariation && (
                  <p className='my-1 text-red-500'>
                    {errors.productVariation.message}
                  </p>
                )}
              </div>
            )}
            {productId && productVariations.length === 0 && (
              <p className='my-1 text-red-500'>
                Não há variações disponíveis para o produto selecionado.
              </p>
            )}
            <div className='w-full mb-4'>
              <Select
                className='w-full border-2 rounded-md mb-4 px-2'
                title='Plataforma'
                name='salePlatform'
                options={salePlatformCommissions.map((salePlatform) => ({
                  value: salePlatform.salePlatform.id
                    ? salePlatform.salePlatform.id.toString()
                    : '',
                  label: salePlatform.salePlatform.name,
                }))}
                register={register}
              />
              {errors.salePlatform && (
                <p className='my-1 text-red-500'>
                  {errors.salePlatform.message}
                </p>
              )}
            </div>
            {salePlatformCommission && (
              <div>
                <div className='w-full mb-4'>
                  <p>
                    Comissão da plataforma:{' '}
                    {salePlatformCommission.commissionPercentage}%
                  </p>
                  <p>
                    Custo por item vendido:{' '}
                    {salePlatformCommission.costPerItemSold
                      ? Number(
                          salePlatformCommission.costPerItemSold,
                        ).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : Number(0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                  </p>
                  <p>
                    Percentual de lucro padrão:{' '}
                    {salePlatformCommission.defaultProfitPercentage}%
                  </p>
                  <p>
                    Lucro adicional:{' '}
                    {salePlatformCommission.additionalProfit?.toLocaleString(
                      'pt-BR',
                      {
                        style: 'currency',
                        currency: 'BRL',
                      },
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className='w-full mb-4'>
              <Input
                className='w-full border-2 rounded-md px-2'
                title='Preço de custo'
                type='number'
                step='0.01'
                placeholder='Digite o preço de custo...'
                {...register('costPrice', { valueAsNumber: true })}
              />
              {errors.costPrice && (
                <p className='my-1 text-red-500'>{errors.costPrice.message}</p>
              )}
            </div>
            <div className='w-full mb-4'>
              <Input
                className='w-full border-2 rounded-md px-2'
                title='Preço de venda'
                type='number'
                step='0.01'
                placeholder='Digite o preço de venda...'
                {...register('salePrice', { valueAsNumber: true })}
                disabled={true}
              />
              {errors.salePrice && (
                <p className='my-1 text-red-500'>{errors.salePrice.message}</p>
              )}
            </div>
            <div className='w-96 flex flex-row float-end'>
              <button
                className='w-full ml-2 rounded-md border-2 border-solid '
                type='button'
                style={{ color: '#001529' }}
                color='white'
                onClick={handleCancel}
              >
                Cancelar
              </button>
              <button
                className='w-full ml-2 rounded-md text-white'
                type='submit'
                style={{ backgroundColor: '#001529' }}
                color='white'
              >
                {pricingId ? 'Editar' : 'Inserir'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
