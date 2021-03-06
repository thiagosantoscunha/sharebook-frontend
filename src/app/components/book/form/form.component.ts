import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ImageResult, ResizeOptions } from 'ng2-imageupload';
import { DomSanitizer } from '@angular/platform-browser';
import { Ng2ImgMaxService } from 'ng2-img-max';

import { BookService } from '../../../core/services/book/book.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { Category } from '../../../core/models/category';
import { FreightOptions } from '../../../core/models/freightOptions';
import { User } from '../../../core/models/user';
import { UserService } from '../../../core/services/user/user.service';
import { AlertService } from '../../../core/services/alert/alert.service';


@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {

  formGroup: FormGroup;
  freightOptions: FreightOptions[] = [];
  categories: Category[] = [];
  facilitators: User[] = [];
  isSaved: Boolean;

  userProfile: string;
  buttonSaveLabel: string;
  pageTitle: string;
  isLoading: Boolean = false;
  isLoadingMessage: string;
  itsEditMode: Boolean = false;
  isImageLoaded: Boolean = false;

  src: string;

  shareBookUser = new User();

  constructor(
    private _scBook: BookService,
    private _scCategory: CategoryService,
    private _scUser: UserService,
    private _formBuilder: FormBuilder,
    private _activatedRoute: ActivatedRoute,
    private _scAlert: AlertService,
    private _ng2ImgMaxService: Ng2ImgMaxService) {

    /*  Inicializa o formGroup defatult por que é obrigatório  */
    this.createFormGroup();
  }

  ngOnInit() {
    this.findProfile();

    if (this._scUser.getLoggedUserFromLocalStorage()) {
      this.shareBookUser = this._scUser.getLoggedUserFromLocalStorage();
    }

    this._scBook.getFreightOptions().subscribe(data =>
      this.freightOptions = data
    );

    this._scCategory.getAll().subscribe(data =>
      this.categories = data
    );

  }

  createFormGroup() {
    this.formGroup = this._formBuilder.group({
      id: '',
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      author: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      categoryId: ['', [Validators.required]],
      userIdFacilitator: [''],
      userId: ['', [Validators.required]],
      freightOption: ['', [Validators.required]],
      imageBytes: [''],
      imageName: [''], // , this.userProfile === 'User' && [Validators.required]],
      approved: false,
      imageUrl: '',
      imageSlug: '',
      synopsis: ['', [Validators.maxLength(2000)]],
    });
  }

  findProfile() {
    this._scUser.getProfile().subscribe(({ profile }) => {
      this.userProfile = profile;
      this.createFormGroup();
      this.getBookSaved();
      this.buildFormsLabels();
    });
  }

  buildFormsLabels() {
    if (this.userProfile === 'User' || !this.itsEditMode) {
      this.buttonSaveLabel = 'Doar este livro';
      this.pageTitle = 'Quero doar um livro';
    } else {
      this.buttonSaveLabel = 'Salvar';
      this.pageTitle = 'Editar livro';
    }
  }

  getBookSaved() {
    let id = '';
    this._activatedRoute.params.subscribe((param) => id = param.id);
    this.itsEditMode = !!id;

    if (this.userProfile === 'Administrator' && id) {
      this._scBook.getById(id).subscribe(x => {
        const bookForUpdate = {
          id: x.id,
          title: x.title,
          author: x.author,
          categoryId: x.categoryId,
          userIdFacilitator: !!x.userIdFacilitator ? x.userIdFacilitator : null,
          userId: x.userId,
          freightOption: x.freightOption,
          imageBytes: '',
          imageName: null,
          approved: x.approved,
          imageUrl: x.imageUrl,
          imageSlug: x.imageSlug,
          synopsis: !!x.synopsis ? x.synopsis : ''
        };
        this.formGroup.get('userIdFacilitator').setValidators([Validators.required]); // Facilitador obrigatório para edição do admin
        this.formGroup.setValue(bookForUpdate);
        this.getAllFacilitators();
      }
      );
    }

    // ao doar um livro, o userId é do usuário logado.
    if (!this.itsEditMode) {
      this.formGroup.get('userId').setValue(this.shareBookUser['userId']);
      this.getAllFacilitators();
    }

  }

  onAddBook() {
    if (this.formGroup.valid) {
      if (this.userProfile === 'User' && !this.isImageLoaded) {
        this._scAlert.error('Selecionar imagem da capa do livro.');
      } else {
        this.isLoading = true;
        this.isLoadingMessage = 'Aguarde...';
        if (!this.formGroup.value.id) {
          if (!this.formGroup.value.imageName) {
            this.formGroup.value.imageName = 'iPhone-image.jpg'; // Para iphone o mesmo não envia o nome da imagem
          }

          this._scBook.create(this.formGroup.value).subscribe(resp => {
            if (resp.success) {
              this.isSaved = true;
              this._scAlert.success('Livro cadastrado com sucesso!');
              this.pageTitle = 'Obrigado por ajudar.';
            } else {
              this._scAlert.error(resp.messages[0]);
            }
            this.isLoading = false;
          }
          );
        } else {
          this._scBook.update(this.formGroup.value).subscribe(resp => {
            this.isSaved = true;
            this.pageTitle = 'Registro atualizado';
            this.isLoading = false;
          }
          );
        }
      }
    }
  }

  onChangeFieldFreightOption(freightOption: string) {
    this.formGroup.controls['freightOption'].setValue(freightOption);
  }

  onChangeFieldApproved(approved: boolean) {
    this.formGroup.controls['approved'].setValue(approved);
  }

  onConvertImageToBase64(imageResult: ImageResult) {

    if (!imageResult.error) {

      this.isLoading = true;
      this.isLoadingMessage = 'Processando imagem...';
      this.isImageLoaded = true;

      this._ng2ImgMaxService.resize([imageResult.file], 600, 10000).subscribe((result) => {
        const reader = new FileReader();
        reader.readAsDataURL(result);

        reader.onload = event => {
          this.src = <string>reader.result;
          const img = this.src.split(',');
          this.formGroup.controls['imageBytes'].setValue(img[1]);
          this.isLoading = false;
        };
      });
    } else {
      this.formGroup.controls['imageName'].setErrors({ InvalidExtension: true });
      this.formGroup.controls['imageBytes'].setValue('');
      this.isImageLoaded = false;
    }
  }

  showFreightPopover(p) {
    const freight = this.formGroup.controls['freightOption'].value;
    if (freight === 'WithoutFreight') {
      p.open();
    } else {
      p.close();
    }
  }

  getAllFacilitators() {
    this._scUser.getAllFacilitators(this.formGroup.get('userId').value).subscribe(data =>
      this.facilitators = data
    );
  }
}
