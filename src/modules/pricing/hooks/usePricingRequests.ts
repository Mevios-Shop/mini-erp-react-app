import toast from 'react-hot-toast';

import { URL_PRICING, URL_PRICING_ID } from '../../../shared/constants/urls';
import { MethodsEnum } from '../../../shared/enums/methods.enum';
import { useRequests } from '../../../shared/hooks/useRequests';
import { IPricingInsert } from '../interfaces/PricingInsertInterface';
import { IPricing } from '../interfaces/PricingInterface';

const usePricingRequests = () => {
  const { request } = useRequests();

  const getPricing = async () => {
    try {
      const response = await request<IPricing[]>(URL_PRICING, MethodsEnum.GET);
      return response;
    } catch (error) {
      toast.error('Erro ao buscar as  precificações');
      throw new Error(`Erro ao buscar as  precificações: ${error}`);
    }
  };

  const getPricingById = async (id: number) => {
    try {
      const response = await request<IPricing>(
        URL_PRICING_ID.replace('{pricingId}', id.toString()),
        MethodsEnum.GET,
      );
      return response;
    } catch (error) {
      toast.error('Erro ao buscar a precificação');
      throw new Error(`Erro ao buscar a precificação: ${error}`);
    }
  };

  const savePricing = async (
    pricing: IPricingInsert,
    id?: string,
  ): Promise<IPricing | Error | undefined> => {
    const url = id ? URL_PRICING_ID.replace('{pricingId}', id) : URL_PRICING;
    const method = id ? MethodsEnum.PATCH : MethodsEnum.POST;

    try {
      const response = await request<IPricing>(url, method, pricing);
      return response;
    } catch (error) {
      toast.error('Erro ao salvar a precificação');
      throw new Error(`Erro ao salvar a precificação: ${error}`);
    }
  };

  return {
    getPricingById,
    getPricing,
    savePricing,
  };
};

export default usePricingRequests;