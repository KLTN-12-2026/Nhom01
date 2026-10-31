import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useGlobalContext } from '../provider/GlobalProvider';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '../utils/AxiosToastError';
import { IoClose } from 'react-icons/io5';
import vietnamProvinces from '../data/vietnam-provinces.json';
import Select from 'react-select';
import { Input } from './ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import Divider from './Divider';
import GlareHover from './GlareHover';

const EditAddressDetails = ({ close, data }) => {
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            _id: data._id,
            userId: data.userId,
            address_line: data.address_line,
            city: data.city,
            district: data.district,
            ward: data.ward,
            country: 'Việt Nam',
            mobile: data.mobile,
            isDefault: data.isDefault || false,
        },
    });
    const { fetchAddress } = useGlobalContext();
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [mobileError, setMobileError] = useState('');

    const validateMobile = (value) => {
        // Vietnamese phone number validation
        // Starts with 0, followed by 9 or 1-9, then 8 more digits (total 10 digits)
        const mobileRegex = /^(0[1-9]|0[1-9][0-9]{8})$/;
        if (!value) {
            setMobileError('Vui lòng nhập số điện thoại');
            return false;
        }
        if (!mobileRegex.test(value)) {
            setMobileError('Số điện thoại không hợp lệ');
            return false;
        }
        setMobileError('');
        return true;
    };

    const handleMobileChange = (e) => {
        const value = e.target.value;
        setValue('mobile', value);
        // Clear error when user starts typing
        if (mobileError) {
            validateMobile(value);
        }
    };

    const removeAccents = (str) => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    };

    const removePrefix = (name) => {
        const prefixes = [
            'Thành phố ',
            'Tỉnh ',
            'Quận ',
            'Huyện ',
            'Phường ',
            'Xã ',
        ];
        let cleanedName = name;
        for (const prefix of prefixes) {
            if (cleanedName.startsWith(prefix)) {
                cleanedName = cleanedName.replace(prefix, '');
                break;
            }
        }
        return cleanedName;
    };

    const customFilter = (option, searchText) => {
        if (!searchText) return true;
        const searchTerm = removeAccents(searchText.toLowerCase());
        const cleanedLabel = removeAccents(
            removePrefix(option.label).toLowerCase()
        );
        return cleanedLabel.startsWith(searchTerm);
    };

    useEffect(() => {
        const provincesWithCode = vietnamProvinces.map((province, index) => ({
            ...province,
            code: index.toString(),
            value: index.toString(),
            label: province.name,
        }));
        setProvinces(provincesWithCode);

        if (data.city) {
            const province = provincesWithCode.find(
                (p) => p.name === data.city
            );
            if (province) {
                setSelectedProvince(province);
                setValue('city', province.name);
            }
        }
    }, [data.city, setValue]);

    useEffect(() => {
        if (selectedProvince) {
            const provinceIndex = parseInt(selectedProvince.value);
            const province = vietnamProvinces[provinceIndex];

            if (province?.districts) {
                const districtsWithCode = province.districts.map(
                    (district, index) => ({
                        ...district,
                        code: index.toString(),
                        value: index.toString(),
                        label: district.name,
                    })
                );
                setDistricts(districtsWithCode);

                if (data.district) {
                    const district = districtsWithCode.find(
                        (d) => d.name === data.district
                    );
                    if (district) {
                        setSelectedDistrict(district);
                        setValue('district', district.name);
                    }
                }
            }
        } else {
            setDistricts([]);
            setWards([]);
            setSelectedDistrict(null);
            setValue('district', '');
            setValue('ward', '');
        }
    }, [selectedProvince, data.district, setValue]);

    useEffect(() => {
        if (selectedProvince && selectedDistrict) {
            const provinceIndex = parseInt(selectedProvince.value);
            const districtIndex = parseInt(selectedDistrict.value);
            const province = vietnamProvinces[provinceIndex];

            if (province?.districts?.[districtIndex]?.wards) {
                const wardsWithCode = province.districts[
                    districtIndex
                ].wards.map((ward, index) => ({
                    ...ward,
                    code: index.toString(),
                    value: index.toString(),
                    label: ward.name,
                }));
                setWards(wardsWithCode);

                if (data.ward) {
                    const ward = wardsWithCode.find(
                        (w) => w.name === data.ward
                    );
                    if (ward) {
                        setTimeout(() => {
                            setValue('ward', ward.code);
                        }, 0);
                    }
                }
            } else {
                setWards([]);
                setValue('ward', '');
            }
        } else {
            setWards([]);
            setValue('ward', '');
        }
    }, [selectedDistrict, selectedProvince, data.ward, setValue]);

    useEffect(() => {
        if (wards.length > 0 && data.ward) {
            const ward = wards.find((w) => w.name === data.ward);
            if (ward) {
                setValue('ward', ward.code);
            }
        }
    }, [wards, data.ward, setValue]);

    const onSubmit = async (formData) => {
        // Validate mobile number before submission
        if (!validateMobile(formData.mobile)) {
            return;
        }

        try {
            const provinceName = selectedProvince ? selectedProvince.label : '';
            const districtName = selectedDistrict ? selectedDistrict.label : '';
            const wardName =
                formData.ward !== ''
                    ? wards[parseInt(formData.ward)]?.name || ''
                    : '';

            const response = await Axios({
                ...SummaryApi.update_address,
                data: {
                    _id: formData._id,
                    userId: formData.userId,
                    address_line: formData.address_line,
                    city: provinceName,
                    district: districtName,
                    ward: wardName,
                    country: formData.country,
                    mobile: formData.mobile,
                    isDefault: !!formData.isDefault,
                },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                toast.success(responseData.message);
                if (close) {
                    close();
                    reset();
                    fetchAddress();
                }
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    return (
        <section
            className="bg-neutral-800 z-50 bg-opacity-60 fixed top-0 left-0 right-0 bottom-0 overflow-auto
        flex items-center justify-center px-3"
        >
            <Card className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
                <CardHeader className="p-5 sm:p-6 border-b border-border/60">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base sm:text-lg text-highlight font-display font-bold uppercase">
                            Sửa địa chỉ
                        </CardTitle>
                        <button
                            onClick={close}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Đóng"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="py-4 space-y-5 text-sm">
                        <div className="space-y-2">
                            <Label htmlFor="addressline">
                                Địa chỉ <span className="text-rose-400">*</span>
                            </Label>
                            <Input
                                type="text"
                                id="addressline"
                                placeholder="Nhập địa chỉ"
                                className="w-full h-11 p-2 border-2 rounded outline-none"
                                {...register('address_line', {
                                    required: true,
                                })}
                                spellCheck={false}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">
                                Tỉnh/Thành phố{' '}
                                <span className="text-rose-400">*</span>
                            </Label>
                            <Select
                                options={provinces.map((province) => ({
                                    value: province.code,
                                    label: province.name,
                                }))}
                                value={selectedProvince}
                                onChange={(selected) => {
                                    setSelectedProvince(selected);
                                    setValue(
                                        'city',
                                        selected ? selected.label : ''
                                    );
                                }}
                                filterOption={customFilter}
                                placeholder="Nhập Tỉnh/Thành phố"
                                isSearchable
                                isClearable
                                classNamePrefix="select"
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isFocused
                                            ? '#FFE5B4'
                                            : state.isSelected
                                            ? '#FFB347'
                                            : '#000',
                                        boxShadow: 'none',
                                        minHeight: '44px',
                                        background: '#000',
                                        color: '#fff',
                                        accentColor: '#fff',
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isFocused
                                            ? '#ecfccb'
                                            : state.isSelected
                                            ? '#bef264'
                                            : '#000',
                                        color: state.isFocused
                                            ? '#000'
                                            : state.isSelected
                                            ? '#000'
                                            : '#fff',
                                        cursor: 'pointer',
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: '#fff',
                                    }),
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district">
                                Quận/Huyện{' '}
                                <span className="text-rose-400">*</span>
                            </Label>
                            <Select
                                options={districts.map((district) => ({
                                    value: district.code,
                                    label: district.name,
                                }))}
                                value={selectedDistrict}
                                onChange={(selected) => {
                                    setSelectedDistrict(selected);
                                    setValue(
                                        'district',
                                        selected ? selected.label : ''
                                    );
                                }}
                                filterOption={customFilter}
                                placeholder="Nhập Quận/Huyện"
                                isSearchable
                                isClearable
                                isDisabled={!selectedProvince}
                                classNames={{
                                    control: (state) =>
                                        state.isDisabled ? 'opacity-60' : '',
                                }}
                                classNamePrefix="select"
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isFocused
                                            ? '#FFE5B4'
                                            : state.isSelected
                                            ? '#FFB347'
                                            : '#000',
                                        boxShadow: 'none',
                                        minHeight: '44px',
                                        background: '#000',
                                        color: '#fff',
                                        accentColor: '#fff',
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isFocused
                                            ? '#ecfccb'
                                            : state.isSelected
                                            ? '#bef264'
                                            : '#000',
                                        color: state.isFocused
                                            ? '#000'
                                            : state.isSelected
                                            ? '#000'
                                            : '#fff',
                                        cursor: 'pointer',
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: '#fff',
                                    }),
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ward">
                                Phường/Xã{' '}
                                <span className="text-rose-400">*</span>
                            </Label>
                            <Select
                                options={wards}
                                value={wards.find(
                                    (w) => w.code === watch('ward')
                                )}
                                onChange={(selected) => {
                                    setValue(
                                        'ward',
                                        selected ? selected.code : ''
                                    );
                                }}
                                getOptionLabel={(option) => option.name}
                                getOptionValue={(option) => option.code}
                                placeholder="Chọn Phường/Xã"
                                isSearchable
                                isClearable
                                isDisabled={!selectedDistrict}
                                noOptionsMessage={() => 'Không có dữ liệu'}
                                classNames={{
                                    control: (state) =>
                                        state.isDisabled ? 'opacity-60' : '',
                                }}
                                classNamePrefix="select"
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isFocused
                                            ? '#FFE5B4'
                                            : state.isSelected
                                            ? '#FFB347'
                                            : '#000',
                                        boxShadow: 'none',
                                        minHeight: '44px',
                                        background: '#000',
                                        color: '#fff',
                                        accentColor: '#fff',
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isFocused
                                            ? '#ecfccb'
                                            : state.isSelected
                                            ? '#bef264'
                                            : '#000',
                                        color: state.isFocused
                                            ? '#000'
                                            : state.isSelected
                                            ? '#000'
                                            : '#fff',
                                        cursor: 'pointer',
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: '#fff',
                                    }),
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobile">
                                Số điện thoại{' '}
                                <span className="text-rose-400">*</span>
                            </Label>
                            <Input
                                type="tel"
                                id="mobile"
                                placeholder="Nhập số điện thoại"
                                className={`w-full h-11 p-2 border-2 rounded outline-none ${
                                    mobileError
                                        ? 'border-rose-400'
                                        : 'focus-within:border-secondary-100'
                                }`}
                                {...register('mobile', {
                                    required: 'Vui lòng nhập số điện thoại',
                                    pattern: {
                                        value: /^(0[1-9]|0[1-9][0-9]{8})$/,
                                        message: 'Số điện thoại không hợp lệ',
                                    },
                                    onChange: handleMobileChange,
                                    onBlur: (e) =>
                                        validateMobile(e.target.value),
                                })}
                                spellCheck={false}
                            />
                            <div className={mobileError ? 'pb-5' : 'pb-0'}>
                                {mobileError && (
                                    <p className="absolute left-0 mt-1 text-sm text-red-600">
                                        {mobileError}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                className="h-4 w-4 mb-[3px] cursor-pointer"
                                disabled={data.isDefault}
                                checked={watch('isDefault')}
                                onChange={(e) =>
                                    setValue('isDefault', e.target.checked)
                                }
                            />
                            <label
                                htmlFor="isDefault"
                                className={`font-medium text-sm ${
                                    data.isDefault
                                        ? 'text-muted-foreground'
                                        : 'text-foreground cursor-pointer'
                                }`}
                            >
                                {data.isDefault
                                    ? 'Địa chỉ mặc định'
                                    : 'Đặt làm địa chỉ mặc định'}
                            </label>
                            {data.isDefault && (
                                <span className="text-primary text-xs ml-2 font-medium">
                                    (Đang là mặc định)
                                </span>
                            )}
                        </div>

                        <Divider />
                        {/* Actions */}
                        <CardFooter className="px-0 pt-2 text-sm flex justify-end">
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                Cập nhật
                            </Button>
                        </CardFooter>
                            </GlareHover>
                        </CardFooter>
                    </CardContent>
                </form>
            </Card>
        </section>
    );
};

export default EditAddressDetails;
