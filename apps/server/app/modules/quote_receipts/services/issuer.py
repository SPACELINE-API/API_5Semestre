from dataclasses import dataclass


@dataclass(frozen=True)
class Issuer:
    legal_name: str
    trade_name: str
    cnpj: str
    address: str
    city: str
    phone: str
    website: str


ALIANCA_TRADUCOES = Issuer(
    legal_name="Aliança Traduções e Comunicações Ltda - EPP",
    trade_name="Aliança Traduções",
    cnpj="04.205.581/0001-59",
    address="Rua Pereira Estefano, 114 - Vila da Saúde",
    city="São Paulo/SP - CEP 04144-070",
    phone="(11) 3384-8550",
    website="aliancatraducoes.com",
)
