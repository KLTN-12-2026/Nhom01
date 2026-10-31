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

const AddAddress = ({ close }) => {
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            isDefault: true, // Set default value to true
        },
    });
    const { fetchAddress } = useGlobalContext();
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [formErrors, setFormErrors] = useState({
        addressline: '',
        city: '',
        district: '',
        ward: '',
        mobile: '',
    });

    const validateField = (name, value) => {
        const newErrors = { ...formErrors };
        let isValid = true;
        let mobileRegex;

        switch (name) {
            case 'mobile':
                mobileRegex = /^(0[1-9]|0[1-9][0-9]{8})$/;
                if (!value) {
                    newErrors.mobile = 'Vui lòng nhập số điện thoại';
                    isValid = false;
                } else if (!mobileRegex.test(value)) {
                    newErrors.mobile = 'Số điện thoại không hợp lệ';
                    isValid = false;
                } else {
                    newErrors.mobile = '';
                }
                break;
            case 'addressline':
                // Add null/undefined check
                const trimmed = value ? value.toString().trim() : '';

                // Rỗng
                if (!trimmed) {
                    newErrors.addressline = 'Vui lòng nhập địa chỉ';
                    isValid = false;
                    break;
                }

                // Rest of your validation logic remains the same
                if (trimmed.length < 5) {
                    newErrors.addressline = 'Địa chỉ quá ngắn';
                    isValid = false;
                    break;
                }

                // Không được chỉ chứa số
                if (/^\d+$/.test(trimmed)) {
                    newErrors.addressline = 'Địa chỉ không thể chỉ chứa số';
                    isValid = false;
                    break;
                }

                // Không được chỉ chứa chữ (abcxyz)
                if (/^[a-zA-Z]+$/.test(trimmed)) {
                    newErrors.addressline = 'Địa chỉ không hợp lệ';
                    isValid = false;
                    break;
                }

                // Loại các chuỗi vô nghĩa kiểu aaaa, ...., ----
                if (/^(.)\1+$/.test(trimmed)) {
                    newErrors.addressline = 'Địa chỉ không hợp lệ';
                    isValid = false;
                    break;
                }

                // Không cho ký tự đặc biệt quá mức
                // Update the regex to handle empty string case
                if (trimmed && /[^\p{L}0-9\s.,/ -]/u.test(trimmed)) {
                    newErrors.addressline =
                        'Địa chỉ chứa ký tự không hợp lệ (chỉ cho phép . , / -)';
                    isValid = false;
                    break;
                }

                // Nếu qua hết -> hợp lệ
                newErrors.addressline = '';
                break;
            case 'city':
                if (!value) {
                    newErrors.city = 'Vui lòng chọn Tỉnh/Thành phố';
                    isValid = false;
                } else {
                    newErrors.city = '';
                }
                break;
            case 'district':
                if (!value) {
                    newErrors.district = 'Vui lòng chọn Quận/Huyện';
                    isValid = false;
                } else {
                    newErrors.district = '';
                }
                break;
            case 'ward':
                if (!value) {
                    newErrors.ward = 'Vui lòng chọn Phường/Xã';
                    isValid = false;
                } else {
                    newErrors.ward = '';
                }
                break;
            default:
                break;
        }

        setFormErrors(newErrors);
        return isValid;
    };

    const validateForm = (formData) => {
        const fieldsToValidate = [
            'addressline',
            'city',
            'district',
            'ward',
            'mobile',
        ];
        let isFormValid = true;

        fieldsToValidate.forEach((field) => {
            const isValid = validateField(field, formData[field]);
            if (!isValid) {
                isFormValid = false;
            }
        });

        return isFormValid;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setValue(name, value);
        if (formErrors[name]) {
            validateField(name, value);
        }
    };

    const handleSelectChange = (field, selected) => {
        setValue(field, selected ? selected.value : '');
        if (field === 'city') {
            setSelectedProvince(selected);
            setDistricts([]);
            setWards([]);
            setSelectedDistrict(null);
            setValue('district', '');
            setValue('ward', '');
        } else if (field === 'district') {
            setSelectedDistrict(selected);
            setWards([]);
            setValue('ward', '');
        }
        if (formErrors[field]) {
            validateField(field, selected ? selected.value : '');
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

    // Lay danh sach tinh/thanh pho
    useEffect(() => {
        const provincesWithCode = vietnamProvinces.map((province, index) => ({
            ...province,
            code: index.toString(),
        }));
        setProvinces(provincesWithCode);
    }, []);

    // Lay danh sach quan/huyen khi chon tinh/thanh pho
    useEffect(() => {
        if (selectedProvince) {
            const provinceIndex = parseInt(selectedProvince.value);
            const province = vietnamProvinces[provinceIndex];
            if (province && province.districts) {
                const districtsWithCode = province.districts.map(
                    (district, index) => ({
                        ...district,
                        code: index.toString(),
                    })
                );
                setDistricts(districtsWithCode);
                setWards([]);
                setSelectedDistrict(null);
                setValue('district', '');
                setValue('ward', '');
            } else {
                setDistricts([]);
                setWards([]);
                setSelectedDistrict(null);
                setValue('district', '');
                setValue('ward', '');
            }
        } else {
            setDistricts([]);
            setWards([]);
            setSelectedDistrict(null);
            setValue('district', '');
            setValue('ward', '');
        }
    }, [selectedProvince, setValue]);

    // Lay danh sach phuong/xa khi chon quan/huyen
    useEffect(() => {
        if (selectedDistrict && selectedProvince) {
            const provinceIndex = parseInt(selectedProvince.value);
            const districtIndex = parseInt(selectedDistrict.value);
            const province = vietnamProvinces[provinceIndex];
            if (
                province &&
                province.districts &&
                province.districts[districtIndex]
            ) {
                const district = province.districts[districtIndex];
                const wardsWithCode = (district.wards || []).map(
                    (ward, index) => ({
                        ...ward,
                        code: index.toString(),
                    })
                );
                setWards(wardsWithCode);
            } else {
                setWards([]);
            }
        } else {
            setWards([]);
        }
    }, [selectedDistrict, selectedProvince]);

    const onSubmit = async (data) => {
        // Validate all fields before submission
        if (!validateForm(data)) {
            return;
        }

        try {
            const provinceName = selectedProvince ? selectedProvince.label : '';
            const districtName = selectedDistrict ? selectedDistrict.label : '';
            const wardName =
                data.ward !== '' ? wards[parseInt(data.ward)]?.name || '' : '';

            const response = await Axios({
                ...SummaryApi.add_address,
                data: {
                    address_line: data.addressline,
                    city: provinceName,
                    district: districtName,
                    ward: wardName,
                    country: 'Việt Nam',
                    mobile: data.mobile,
                    isDefault: !!data.isDefault,
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
                            Thêm địa chỉ
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
                                autoFocus
                                className={`w-full h-11 p-2 border-2 rounded outline-none ${
                                    formErrors.addressline
                                        ? 'border-rose-400'
                                        : 'focus-within:border-secondary-100'
                                }`}
                                {...register('addressline', {
                                    required: true,
                                    onChange: handleInputChange,
                                    onBlur: (e) =>
                                        validateField(
                                            'addressline',
                                            e.target.value
                                        ),
                                })}
                                spellCheck={false}
                            />
                            {formErrors.addressline && (
                                <p className="mt-1 text-sm text-rose-400">
                                    {formErrors.addressline}
                                </p>
                            )}
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
                                onChange={(selected) =>
                                    handleSelectChange('city', selected)
                                }
                                onBlur={() =>
                                    validateField(
                                        'city',
                                        selectedProvince?.value || ''
                                    )
                                }
                                filterOption={customFilter}
                                placeholder="Nhập Tỉnh/Thành phố"
                                isSearchable
                                isClearable
                                className={`${
                                    formErrors.city ? 'border-rose-400' : ''
                                } w-full`}
                                classNamePrefix="select"
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        borderColor: formErrors.city
                                            ? '#ef4444'
                                            : state.isFocused
                                            ? '#9ca3af'
                                            : '#374151',
                                        '&:hover': {
                                            borderColor: formErrors.city
                                                ? '#ef4444'
                                                : state.isFocused
                                                ? '#9ca3af'
                                                : '#e5e7eb',
                                        },
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
                            {formErrors.city && (
                                <p className="mt-1 text-sm text-rose-400">
                                    {formErrors.city}
                                </p>
                            )}
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
                                onChange={(selected) =>
                                    handleSelectChange('district', selected)
                                }
                                onBlur={() =>
                                    validateField(
                                        'district',
                                        selectedDistrict?.value || ''
                                    )
                                }
                                filterOption={customFilter}
                                placeholder="Nhập Quận/Huyện"
                                isSearchable
                                isClearable
                                isDisabled={!selectedProvince}
                                className={`${
                                    formErrors.district ? 'border-rose-400' : ''
                                } w-full`}
                                classNames={{
                                    control: (state) =>
                                        state.isDisabled ? 'opacity-60' : '',
                                }}
                                classNamePrefix="select"
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        borderColor: formErrors.district
                                            ? '#ef4444'
                                            : state.isFocused
                                            ? '#9ca3af'
                                            : '#374151',
                                        '&:hover': {
                                            borderColor: formErrors.district
                                                ? '#ef4444'
                                                : state.isFocused
                                                ? '#9ca3af'
                                                : '#e5e7eb',
                                        },
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
                            {formErrors.district && (
                                <p className="mt-1 text-sm text-red-600">
                                    {formErrors.district}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ward">
                                Phường/Xã{' '}
                                <span className="text-rose-400">*</span>
                            </Label>
                            <Select
                                options={wards.map((ward) => ({
                                    value: ward.code,
                                    label: ward.name,
                                }))}
                                onChange={(selected) => {
                                    setValue(
                                        'ward',
                                        selected ? selected.value : ''
                                    );
                                    if (formErrors.ward) {
                                        validateField(
                                            'ward',
                                            selected ? selected.value : ''
                                        );
                                    }
                                }}
                                onBlur={() =>
                                    validateField('ward', watch('ward') || '')
                                }
                                filterOption={customFilter}
                                placeholder="Nhập Phường/Xã"
                                isSearchable
                                isClearable
                                isDisabled={!selectedDistrict}
                                className={`${
                                    formErrors.ward ? 'border-rose-400' : ''
                                } w-full`}
                                classNames={{
                                    control: (state) =>
                                        state.isDisabled ? 'opacity-60' : '',
                                }}
                                classNamePrefix="select"
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        borderColor: formErrors.ward
                                            ? '#ef4444'
                                            : state.isFocused
                                            ? '#9ca3af'
                                            : '#374151',
                                        '&:hover': {
                                            borderColor: formErrors.ward
                                                ? '#ef4444'
                                                : state.isFocused
                                                ? '#9ca3af'
                                                : '#e5e7eb',
                                        },
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
                            {formErrors.ward && (
                                <p className="mt-1 text-sm text-red-600">
                                    {formErrors.ward}
                                </p>
                            )}
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
                                    formErrors.mobile
                                        ? 'border-rose-400'
                                        : 'focus-within:border-secondary-100'
                                }`}
                                {...register('mobile', {
                                    required: 'Vui lòng nhập số điện thoại',
                                    pattern: {
                                        value: /^(0[1-9]|0[1-9][0-9]{8})$/,
                                        message: 'Số điện thoại không hợp lệ',
                                    },
                                    onChange: (e) => {
                                        const value = e.target.value;
                                        setValue('mobile', value);
                                        if (formErrors.mobile) {
                                            validateField('mobile', value);
                                        }
                                    },
                                    onBlur: (e) =>
                                        validateField('mobile', e.target.value),
                                })}
                                spellCheck={false}
                            />
                            {formErrors.mobile && (
                                <p className="mt-1 text-sm text-rose-400">
                                    {formErrors.mobile}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                                {...register('isDefault')}
                            />
                            <label
                                htmlFor="isDefault"
                                className="font-medium text-foreground cursor-pointer text-sm"
                            >
                                Đặt làm địa chỉ mặc định
                            </label>
                        </div>

                        <Divider />
                        {/* Actions */}
                        <CardFooter className="px-0 pt-2 text-sm flex justify-end">
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                Thêm địa chỉ
                            </Button>
                        </CardFooter>
                    </CardContent>
                </form>
            </Card>
        </section>
    );
};

export default AddAddress;
